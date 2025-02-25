
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, part } = await req.json();
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch lecture content and AI config
    console.log('Fetching lecture and AI config data...');
    const [lectureResult, aiConfigResult] = await Promise.all([
      supabase
        .from('lectures')
        .select('content')
        .eq('id', lectureId)
        .single(),
      supabase
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .maybeSingle()
    ]);

    if (lectureResult.error) throw lectureResult.error;
    if (!lectureResult.data?.content) throw new Error('No lecture content found');

    const lectureContent = lectureResult.data.content;
    const aiConfig = aiConfigResult.data || {
      temperature: 0.7,
      creativityLevel: 0.5,
      detailLevel: 0.6,
      contentLanguage: null,
      hasCustomInstructions: false
    };

    console.log('Using AI config:', JSON.stringify(aiConfig, null, 2));

    // Function to generate content using OpenAI
    async function generateWithAI(prompt: string) {
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert at analyzing and summarizing lecture content. ${
                aiConfig.contentLanguage ? `Please provide the response in ${aiConfig.contentLanguage}.` : ''
              } ${aiConfig.custom_instructions || ''}`
            },
            { role: 'user', content: prompt }
          ],
          temperature: aiConfig.temperature,
        }),
      });

      const data = await response.json();
      return data.choices[0].message.content;
    }

    let content;
    if (part === 'first-cards') {
      // Generate first three sections
      const [structure, keyConcepts, mainIdeas] = await Promise.all([
        generateWithAI(`Analyze the following lecture content and provide a clear outline of its structure:
          ${lectureContent}`),
        generateWithAI(`Identify and explain the key concepts from this lecture content:
          ${lectureContent}`),
        generateWithAI(`Summarize the main ideas and arguments presented in this lecture:
          ${lectureContent}`)
      ]);

      content = { structure, key_concepts: keyConcepts, main_ideas: mainIdeas };
    } 
    else if (part === 'second-cards') {
      // Generate last three sections
      const [quotes, relationships, evidence] = await Promise.all([
        generateWithAI(`Extract and list the most important quotes from this lecture:
          ${lectureContent}`),
        generateWithAI(`Analyze the relationships between different concepts in this lecture:
          ${lectureContent}`),
        generateWithAI(`Identify and explain the supporting evidence used in this lecture:
          ${lectureContent}`)
      ]);

      content = { 
        important_quotes: quotes,
        relationships,
        supporting_evidence: evidence
      };
    }
    else if (part === 'full') {
      const fullSummary = await generateWithAI(`Provide a comprehensive summary of this lecture content:
        ${lectureContent}`);
      
      content = { full_content: fullSummary };
    }

    // Update or insert the content in the database
    const { data: existingHighlight } = await supabase
      .from('lecture_highlights')
      .select('id')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (existingHighlight) {
      await supabase
        .from('lecture_highlights')
        .update(content)
        .eq('id', existingHighlight.id);
    } else {
      await supabase
        .from('lecture_highlights')
        .insert({
          ...content,
          lecture_id: lectureId
        });
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

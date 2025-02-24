
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    console.log('Processing request for lecture:', lectureId, 'part:', part);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the lecture content and AI configuration
    const [lectureResult, aiConfigResult] = await Promise.all([
      supabase
        .from('lectures')
        .select('content, title')
        .eq('id', lectureId)
        .single(),
      supabase
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .maybeSingle()
    ]);

    if (lectureResult.error) {
      console.error('Error fetching lecture:', lectureResult.error);
      throw new Error('Failed to fetch lecture content');
    }

    const lectureData = lectureResult.data;
    const aiConfig = aiConfigResult.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      content_language: null,
      custom_instructions: null
    };

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (part === 'full') {
      // Generate full summary
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert educational content analyzer.' },
            { 
              role: 'user', 
              content: `Provide a comprehensive, detailed summary of the following lecture content:
                ${aiConfig.custom_instructions ? `\nSpecific instructions: ${aiConfig.custom_instructions}` : ''}
                ${aiConfig.content_language ? `\nPlease provide the content in: ${aiConfig.content_language}` : ''}
                
                Title: ${lectureData.title}
                Content: ${lectureData.content}`
            }
          ],
          temperature: aiConfig.temperature,
          presence_penalty: aiConfig.creativity_level,
          frequency_penalty: aiConfig.detail_level,
        }),
      });

      const data = await response.json();
      const fullContent = data.choices[0].message.content.trim();

      // Store the full summary
      await supabase
        .from('lecture_highlights')
        .upsert({
          lecture_id: lectureId,
          full_content: fullContent,
          updated_at: new Date().toISOString()
        });

      return new Response(JSON.stringify({ content: { full_content: fullContent } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Generate highlights
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
              content: `You are an expert educational content analyzer. Analyze the lecture content and provide a detailed analysis in 6 sections. Format your response exactly like this, using these exact section names:

Structure:
[Your analysis of the document's structure]

Key Concepts:
[List and explanation of key concepts]

Main Ideas:
[Analysis of main ideas]

Important Quotes:
[Notable quotes from the text]

Relationships:
[Analysis of relationships between concepts]

Supporting Evidence:
[Analysis of supporting evidence used]

${aiConfig.custom_instructions ? `\nAdditional instructions: ${aiConfig.custom_instructions}` : ''}
${aiConfig.content_language ? `\nProvide the content in: ${aiConfig.content_language}` : ''}`
            },
            {
              role: 'user',
              content: `Title: ${lectureData.title}\n\nContent: ${lectureData.content}`
            }
          ],
          temperature: aiConfig.temperature,
          presence_penalty: aiConfig.creativity_level,
          frequency_penalty: aiConfig.detail_level,
        }),
      });

      const data = await response.json();
      const content = data.choices[0].message.content.trim();

      // Parse the sections
      const sections = {
        structure: content.match(/Structure:([\s\S]*?)(?=Key Concepts:|$)/)?.[1]?.trim() || '',
        key_concepts: content.match(/Key Concepts:([\s\S]*?)(?=Main Ideas:|$)/)?.[1]?.trim() || '',
        main_ideas: content.match(/Main Ideas:([\s\S]*?)(?=Important Quotes:|$)/)?.[1]?.trim() || '',
        important_quotes: content.match(/Important Quotes:([\s\S]*?)(?=Relationships:|$)/)?.[1]?.trim() || '',
        relationships: content.match(/Relationships:([\s\S]*?)(?=Supporting Evidence:|$)/)?.[1]?.trim() || '',
        supporting_evidence: content.match(/Supporting Evidence:([\s\S]*?)(?=$)/)?.[1]?.trim() || ''
      };

      // Store the highlights
      await supabase
        .from('lecture_highlights')
        .upsert({
          lecture_id: lectureId,
          ...sections,
          updated_at: new Date().toISOString()
        });

      return new Response(JSON.stringify({ content: sections }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in generate-lecture-summary:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check the function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

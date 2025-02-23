
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { lectureId, sections } = await req.json();

    // Fetch lecture AI configurations
    const { data: aiConfig, error: aiConfigError } = await supabase
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (aiConfigError) throw aiConfigError;

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError) throw lectureError;

    const defaultConfig = {
      temperature: 0.7,
      creativity_level: 0.6,
      detail_level: 0.7,
      content_language: 'English',
      custom_instructions: '',
    };

    const config = aiConfig || defaultConfig;
    const targetLanguage = config.content_language || 'English';
    
    const systemPrompt = `You are an expert educational content analyzer. ${
      config.custom_instructions ? config.custom_instructions + ' ' : ''
    }Generate a detailed analysis in ${targetLanguage} for multiple aspects. Maintain consistent language throughout the response.`;

    // Generate a combined prompt for all requested sections
    const combinedPrompt = sections.map(section => generatePromptForSection(section, lecture.content)).join('\n\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze the following aspects simultaneously and provide a combined response:\n\n${combinedPrompt}` }
        ],
        temperature: config.temperature,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate content');
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-lecture-summary:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generatePromptForSection(section: string, content: string): string {
  const prompts: Record<string, string> = {
    structure: `Analyze this lecture content and create a detailed structural outline.
    Content to analyze: ${content}
    Return the response as a JSON object with this exact key: { "structure": "detailed structural analysis" }`,
    
    keyConcepts: `Analyze this lecture content and identify 4-5 key concepts with explanations.
    Content to analyze: ${content}
    Return the response as a JSON object with this exact key: { "keyConcepts": {"concept1": "explanation1", ...} }`,
    
    mainIdeas: `Analyze this lecture content and list 4-5 main ideas with elaborations.
    Content to analyze: ${content}
    Return the response as a JSON object with this exact key: { "mainIdeas": {"idea1": "explanation1", ...} }`,
    
    importantQuotes: `Find 4-5 significant quotes or statements from this lecture content.
    Content to analyze: ${content}
    Return the response as a JSON object with this exact key: { "importantQuotes": {"context1": "quote1", ...} }`,
    
    relationships: `Identify 4-5 key relationships or connections between concepts in this lecture.
    Content to analyze: ${content}
    Return the response as a JSON object with this exact key: { "relationships": {"connection1": "explanation1", ...} }`,
    
    supportingEvidence: `Present 4-5 pieces of supporting evidence or examples from this lecture.
    Content to analyze: ${content}
    Return the response as a JSON object with this exact key: { "supportingEvidence": {"evidence1": "explanation1", ...} }`
  };

  return prompts[section] || prompts.structure;
}

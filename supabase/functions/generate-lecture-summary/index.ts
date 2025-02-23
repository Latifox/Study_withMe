
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { lectureId } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get lecture content and AI config
    const [lectureResult, configResult] = await Promise.all([
      supabase.from('lectures').select('content, title').eq('id', lectureId).single(),
      supabase.from('lecture_ai_configs').select('*').eq('lecture_id', lectureId).maybeSingle()
    ]);

    if (lectureResult.error) throw lectureResult.error;
    
    const lecture = lectureResult.data;
    const aiConfig = configResult.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      content_language: null,
      custom_instructions: null
    };

    console.log('Using AI config:', aiConfig);

    // Prepare system message based on AI config
    let systemMessage = `You are an educational content analyzer. Your task is to analyze lecture content and provide a structured summary.
    Creativity Level: ${aiConfig.creativity_level} (higher means more creative and engaging language)
    Detail Level: ${aiConfig.detail_level} (higher means more comprehensive analysis)
    ${aiConfig.custom_instructions ? `Additional Instructions: ${aiConfig.custom_instructions}` : ''}
    
    Format the response in the following JSON structure:
    {
      "structure": "Overview of main topics and organization",
      "keyConcepts": "Key theoretical concepts and definitions",
      "mainIdeas": "Main arguments and ideas",
      "importantQuotes": "Notable quotes and statements",
      "relationships": "Connections between concepts",
      "supportingEvidence": "Examples and evidence used",
      "fullContent": "Detailed comprehensive summary"
    }
    
    ${aiConfig.content_language ? `Provide the response in ${aiConfig.content_language}.` : ''}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: `Title: ${lecture.title}\n\nContent:\n${lecture.content}` }
        ],
        temperature: aiConfig.temperature,
      }),
    });

    const data = await response.json();
    console.log('OpenAI Response Status:', response.status);
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    const summary = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-lecture-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

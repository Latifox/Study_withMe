
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

    const { lectureId, part } = await req.json();

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
    }Generate a detailed summary in ${targetLanguage}. Maintain consistent language throughout the response.`;

    const generateSection = async (messages: any[]) => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
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

      console.log('OpenAI Response Status:', response.status);
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    };

    let content;
    if (part === 'part1') {
      content = await generateSection([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze this lecture content and create a comprehensive summary with the following sections:
          1. Structure: Outline the main sections and flow of the lecture
          2. Key Concepts: Identify and explain 4-5 key concepts
          3. Main Ideas: List and elaborate on 4-5 main ideas
          
          Content to analyze: ${lecture.content}
          
          Return the response as a JSON object with these exact keys: 
          {
            "structure": "detailed structural analysis",
            "keyConcepts": {"concept1": "explanation1", ...},
            "mainIdeas": {"idea1": "explanation1", ...}
          }`
        }
      ]);
    } else if (part === 'part2') {
      content = await generateSection([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze this lecture content and create a detailed summary focusing on:
          1. Important Quotes: Find 4-5 significant quotes or statements
          2. Relationships: Identify 4-5 key relationships or connections between concepts
          3. Supporting Evidence: Present 4-5 pieces of supporting evidence or examples
          
          Content to analyze: ${lecture.content}
          
          Return the response as a JSON object with these exact keys:
          {
            "importantQuotes": {"context1": "quote1", ...},
            "relationships": {"connection1": "explanation1", ...},
            "supportingEvidence": {"evidence1": "explanation1", ...}
          }`
        }
      ]);
    } else if (part === 'full') {
      content = await generateSection([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Generate a comprehensive summary of the lecture content.
          
          Content to analyze: ${lecture.content}
          
          Return the response as a JSON object with this exact key:
          {
            "fullContent": "comprehensive summary"
          }`
        }
      ]);
    }

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

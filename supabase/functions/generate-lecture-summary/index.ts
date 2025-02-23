
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { lectureId, sections } = await req.json();

    console.log('Received request for lectureId:', lectureId, 'sections:', sections);

    // Fetch lecture AI configurations
    const { data: aiConfig, error: aiConfigError } = await supabase
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (aiConfigError) {
      console.error('Error fetching AI config:', aiConfigError);
      throw aiConfigError;
    }

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw lectureError;
    }

    const defaultConfig = {
      temperature: 0.7,
      creativity_level: 0.6,
      detail_level: 0.7,
      content_language: 'English',
      custom_instructions: '',
    };

    const config = aiConfig || defaultConfig;
    const targetLanguage = config.content_language || 'English';
    
    // Create prompts for requested sections
    const prompt = sections.map(section => {
      switch(section) {
        case 'structure':
          return `Analyze and create a detailed structural outline for this lecture content in ${targetLanguage}.`;
        case 'keyConcepts':
          return `List and explain 4-5 key concepts from this lecture in ${targetLanguage}.`;
        case 'mainIdeas':
          return `Identify and elaborate on 4-5 main ideas from this lecture in ${targetLanguage}.`;
        case 'importantQuotes':
          return `Find 4-5 significant quotes or statements from this lecture in ${targetLanguage}.`;
        case 'relationships':
          return `Identify 4-5 key relationships or connections between concepts in ${targetLanguage}.`;
        case 'supportingEvidence':
          return `Present 4-5 pieces of supporting evidence from the lecture in ${targetLanguage}.`;
        default:
          return '';
      }
    }).join('\n\n');

    console.log('Sending request to OpenAI with configuration:', {
      temperature: config.temperature,
      targetLanguage,
      sections
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert educational content analyzer. ${
              config.custom_instructions ? config.custom_instructions + ' ' : ''
            }Analyze the content and provide detailed responses for each requested section. Always structure your response as a valid JSON object with the exact section names as keys.`
          },
          {
            role: 'user',
            content: `Analyze these aspects of the following lecture content:\n\n${prompt}\n\nLecture content: ${lecture.content}`
          }
        ],
        temperature: config.temperature,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate content');
    }

    const data = await response.json();
    console.log('Received OpenAI response:', data);

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response format:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    let content;
    try {
      const rawContent = data.choices[0].message.content.trim();
      // Remove any potential markdown code block syntax
      const cleanContent = rawContent.replace(/```json\n?|\n?```/g, '');
      content = JSON.parse(cleanContent);
      
      // Validate the response structure
      const missingKeys = sections.filter(key => !(key in content));
      if (missingKeys.length > 0) {
        console.error('Missing keys in response:', missingKeys);
        throw new Error(`Missing required sections: ${missingKeys.join(', ')}`);
      }
    } catch (error) {
      console.error('JSON parsing error:', error);
      console.error('Raw content:', data.choices[0].message.content);
      throw new Error('Failed to parse JSON response');
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

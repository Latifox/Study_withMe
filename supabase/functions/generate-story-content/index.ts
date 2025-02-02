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

  try {
    const { lectureId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError) throw lectureError;

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
            content: `You are an expert at creating interactive learning content. Analyze the lecture content and create a concept map with detailed information. Format your response as a JSON object with the following structure:
            {
              "concepts": [
                {
                  "id": "string",
                  "title": "string",
                  "description": "detailed explanation",
                  "quotes": ["relevant quote 1", "relevant quote 2"],
                  "position": { "x": number, "y": number },
                  "connections": ["id-of-related-concept"],
                  "quiz": {
                    "trueFalse": {
                      "question": "string",
                      "answer": boolean,
                      "explanation": "string"
                    },
                    "multipleChoice": {
                      "question": "string",
                      "options": ["string", "string", "string", "string"],
                      "correctAnswer": "string",
                      "explanation": "string"
                    }
                  }
                }
              ]
            }`
          },
          {
            role: 'user',
            content: lecture.content
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate story content');
    }

    const data = await response.json();
    const storyContent = JSON.parse(data.choices[0].message.content);

    return new Response(
      JSON.stringify({ storyContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
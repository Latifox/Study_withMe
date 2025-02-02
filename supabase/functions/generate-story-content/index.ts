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
    console.log('Generating story content for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw lectureError;
    }

    console.log('Successfully fetched lecture content, generating story...');

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
            content: `You are an expert at creating interactive learning content. Analyze the lecture content and create a concept map with detailed information. 
            
            Important: Return ONLY valid JSON without any markdown formatting or additional text.
            
            The response should follow this exact structure:
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
      console.error('OpenAI API error:', response.status);
      const errorText = await response.text();
      console.error('OpenAI API error details:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received OpenAI response');

    let storyContent;
    try {
      // Remove any potential markdown formatting and clean the string
      const cleanContent = data.choices[0].message.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      storyContent = JSON.parse(cleanContent);
      console.log('Successfully parsed story content');
    } catch (error) {
      console.error('Error parsing story content:', error);
      console.error('Raw content:', data.choices[0].message.content);
      throw new Error('Failed to parse story content');
    }

    return new Response(
      JSON.stringify({ storyContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-story-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
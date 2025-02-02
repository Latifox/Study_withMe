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
    const { lectureId, segmentNumber, segmentTitle, lectureContent } = await req.json();
    console.log(`Generating content for segment ${segmentNumber}: ${segmentTitle}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are a detailed educational content generator. Generate content for a segment titled "${segmentTitle}" from the lecture content. Follow this exact JSON structure:
{
  "slides": [
    {
      "id": "slide-1",
      "content": "detailed markdown content"
    },
    {
      "id": "slide-2",
      "content": "detailed markdown content"
    }
  ],
  "questions": [
    {
      "id": "question-1",
      "type": "multiple_choice",
      "question": "question text",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "correct option",
      "explanation": "detailed explanation"
    },
    {
      "id": "question-2",
      "type": "true_false",
      "question": "question text",
      "correctAnswer": true,
      "explanation": "detailed explanation"
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Generate detailed educational content for the segment "${segmentTitle}" based on this lecture content: ${lectureContent}`
          }
        ],
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResponseData = await openAIResponse.json();
    const content = JSON.parse(aiResponseData.choices[0].message.content);

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-segment-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
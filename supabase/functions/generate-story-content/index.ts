import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Fetch both lecture content and AI configuration
    const [{ data: lecture, error: lectureError }, { data: aiConfig }] = await Promise.all([
      supabaseClient
        .from('lectures')
        .select('content, title')
        .eq('id', lectureId)
        .single(),
      supabaseClient
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .single()
    ]);

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    if (!lecture?.content) {
      throw new Error('No lecture content found');
    }

    const config = aiConfig || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      custom_instructions: ''
    };

    console.log('Using AI config:', config);

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
            content: `You are a story content generator. Generate educational content in the following JSON format ONLY:
{
  "segments": [
    {
      "id": "segment-1",
      "title": "string",
      "slides": [
        {
          "id": "slide-1-1",
          "content": "string"
        },
        {
          "id": "slide-1-2",
          "content": "string"
        }
      ],
      "questions": [
        {
          "id": "question-1-1",
          "type": "multiple_choice",
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        },
        {
          "id": "question-1-2",
          "type": "true_false",
          "question": "string",
          "correctAnswer": true,
          "explanation": "string"
        }
      ]
    }
  ]
}

Create exactly 10 segments. Each segment must have exactly 2 slides and 2 questions. Keep content focused and concise.
DO NOT include any markdown formatting or additional text. ONLY output valid JSON.`
          },
          {
            role: 'user',
            content: `Create a learning journey for this lecture titled "${lecture.title}". Content: ${lecture.content}`
          }
        ],
        temperature: config.temperature,
        max_tokens: 3000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResponseData = await openAIResponse.json();
    
    if (!aiResponseData.choices?.[0]?.message?.content) {
      console.error('Invalid AI response structure:', aiResponseData);
      throw new Error('Invalid AI response structure');
    }

    let storyContent;
    try {
      const rawContent = aiResponseData.choices[0].message.content;
      console.log('Raw AI response:', rawContent);
      
      // Parse the JSON response
      storyContent = JSON.parse(rawContent);
      
      // Validate structure
      if (!storyContent.segments || !Array.isArray(storyContent.segments)) {
        throw new Error('Invalid story content structure: missing segments array');
      }

      // Validate each segment has exactly 2 slides and 2 questions
      storyContent.segments.forEach((segment: any, index: number) => {
        if (!segment.slides || segment.slides.length !== 2) {
          throw new Error(`Segment ${index + 1} does not have exactly 2 slides`);
        }
        if (!segment.questions || segment.questions.length !== 2) {
          throw new Error(`Segment ${index + 1} does not have exactly 2 questions`);
        }
      });

      console.log('Successfully validated story content structure');

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    return new Response(
      JSON.stringify({ storyContent }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Error in generate-story-content function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        },
      }
    );
  }
});
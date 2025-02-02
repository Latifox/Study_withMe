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
    const { lectureId } = await req.json();
    console.log('Generating study plan for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content and AI config
    const [{ data: lecture, error: lectureError }, { data: config }] = await Promise.all([
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

    if (lectureError || !lecture?.content) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    const aiConfig = config || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      custom_instructions: ''
    };

    const systemMessage = `You are a study plan generator. Create a comprehensive study plan based on lecture content.
    
    Adjust your output based on these parameters:
    - Creativity Level: ${aiConfig.creativity_level} (higher means more innovative study approaches)
    - Detail Level: ${aiConfig.detail_level} (higher means more detailed study plans)
    
    ${aiConfig.custom_instructions ? `Additional instructions:\n${aiConfig.custom_instructions}\n\n` : ''}
    
    Return ONLY a JSON object with this exact structure (no markdown, no extra text):
    {
      "title": "string",
      "topics": [
        {
          "title": "string",
          "keyPoints": ["string"],
          "studyApproach": "string",
          "estimatedTime": "string"
        }
      ],
      "additionalResources": ["string"],
      "practiceExercises": ["string"]
    }`;

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
            content: systemMessage
          },
          {
            role: 'user',
            content: `Create a study plan for this lecture titled "${lecture.title}":\n\n${lecture.content}`
          }
        ],
        temperature: aiConfig.temperature,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      throw new Error('Failed to generate study plan');
    }

    const data = await response.json();
    console.log('OpenAI response:', data.choices[0].message.content);

    // Parse the response content directly, assuming it's already valid JSON
    const studyPlan = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(studyPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error generating study plan:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
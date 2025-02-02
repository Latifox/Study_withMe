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
    console.log('Generating learning journey for lecture:', lectureId);

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

    const systemMessage = `You are a learning journey planner. Create an engaging, personalized learning path based on the lecture content.
    
    Adjust your output based on these parameters:
    - Creativity Level: ${aiConfig.creativity_level} (higher means more creative learning approaches)
    - Detail Level: ${aiConfig.detail_level} (higher means more detailed explanations)
    
    ${aiConfig.custom_instructions ? `Additional instructions:\n${aiConfig.custom_instructions}\n\n` : ''}
    
    Analyze the lecture content and create a structured learning journey that follows this specific order:
    1. Big Picture Understanding (Summary)
    2. Interactive Learning (Chat)
    3. Knowledge Reinforcement (Flashcards)
    4. Knowledge Testing (Quiz)
    5. Further Exploration (Resources)

    Return ONLY a JSON object with this exact structure (no markdown, no extra text):
    {
      "title": "string (engaging title for the learning journey)",
      "keyTopics": ["array of the most important topics from the lecture"],
      "learningSteps": [
        {
          "step": 1,
          "title": "Get the Big Picture",
          "description": "string (why this step is important)",
          "action": "summary",
          "timeEstimate": "string (estimated time)",
          "benefits": ["array of benefits"]
        },
        {
          "step": 2,
          "title": "Interactive Learning Session",
          "description": "string",
          "action": "chat",
          "timeEstimate": "string",
          "benefits": ["array"]
        },
        {
          "step": 3,
          "title": "Reinforce Your Knowledge",
          "description": "string",
          "action": "flashcards",
          "timeEstimate": "string",
          "benefits": ["array"]
        },
        {
          "step": 4,
          "title": "Test Your Understanding",
          "description": "string",
          "action": "quiz",
          "timeEstimate": "string",
          "benefits": ["array"]
        },
        {
          "step": 5,
          "title": "Explore Further",
          "description": "string",
          "action": "resources",
          "timeEstimate": "string",
          "benefits": ["array"]
        }
      ]
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
            content: `Create a learning journey for this lecture titled "${lecture.title}":\n\n${lecture.content}`
          }
        ],
        temperature: aiConfig.temperature,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      throw new Error('Failed to generate learning journey');
    }

    const data = await response.json();
    const learningJourney = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(learningJourney), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error generating learning journey:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
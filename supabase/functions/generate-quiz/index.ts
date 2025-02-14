
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
    const { lectureId, config: quizConfig } = await req.json();
    console.log('Generating quiz for lecture:', lectureId, 'with config:', quizConfig);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content and AI config
    const [{ data: lecture, error: lectureError }, { data: aiConfig }] = await Promise.all([
      supabaseClient
        .from('lectures')
        .select('content')
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

    const config = aiConfig || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      custom_instructions: ''
    };

    console.log('Fetched lecture content and AI config, sending to Gemini...');

    // Generate quiz using Gemini
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': Deno.env.get('GOOGLE_API_KEY') || '',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{
              text: `Generate a quiz based on this lecture content:\n\n${lecture.content}\n\n` +
                    `Requirements:\n` +
                    `- Generate exactly ${quizConfig.numberOfQuestions} questions\n` +
                    `- Difficulty level: ${quizConfig.difficulty}\n` +
                    `- Question types: ${quizConfig.questionTypes}\n` +
                    `${quizConfig.hintsEnabled ? '- Include a helpful hint for each question\n' : ''}` +
                    `\nFormat each question as a JSON object with these properties:\n` +
                    `{\n` +
                    `  "question": "string with the question text",\n` +
                    `  "type": "multiple_choice" or "true_false",\n` +
                    `  "options": ["array", "of", "possible", "answers"],\n` +
                    `  "correctAnswer": "must match one of the options exactly",\n` +
                    `  ${quizConfig.hintsEnabled ? '"hint": "helpful hint text",\n' : ''}` +
                    `}\n\n` +
                    `Important rules:\n` +
                    `- For multiple choice: provide exactly 4 options\n` +
                    `- For true/false: options must be exactly ["True", "False"]\n` +
                    `- Return an array of question objects\n` +
                    `\nAdjust output based on these parameters:\n` +
                    `- Creativity Level: ${config.creativity_level}\n` +
                    `- Detail Level: ${config.detail_level}`
            }]
          }
        ],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      console.error('Google API error:', response.status);
      const errorText = await response.text();
      console.error('Google API error details:', errorText);
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw Gemini response:', data.candidates[0].content.parts[0].text);

    let quiz;
    try {
      // Parse the response into JSON
      quiz = JSON.parse(data.candidates[0].content.parts[0].text);
      
      // Validate quiz structure
      if (!Array.isArray(quiz)) {
        throw new Error('Quiz response is not an array');
      }
      
      // Validate each question
      quiz.forEach((q, i) => {
        if (!q.question || !q.type || !q.options || !q.correctAnswer) {
          throw new Error(`Question ${i + 1} is missing required properties`);
        }
        if (!q.options.includes(q.correctAnswer)) {
          throw new Error(`Question ${i + 1} correct answer is not in options`);
        }
      });
      
      console.log('Successfully parsed and validated quiz:', quiz);
    } catch (error) {
      console.error('Error parsing or validating quiz JSON:', error);
      console.error('Raw content:', data.candidates[0].content.parts[0].text);
      throw new Error(`Failed to parse quiz JSON: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ quiz }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating quiz:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

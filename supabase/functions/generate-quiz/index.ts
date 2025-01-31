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
    const { lectureId, config } = await req.json();
    console.log('Generating quiz for lecture:', lectureId, 'with config:', config);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture?.content) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    console.log('Fetched lecture content, sending to OpenAI...');

    // Generate quiz using OpenAI
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
            content: `You are a quiz generator. Generate a quiz based on the provided lecture content. 
            
            Rules:
            - Generate exactly ${config.numberOfQuestions} questions
            - Difficulty level: ${config.difficulty}
            - Question types: ${config.questionTypes === 'mixed' ? 'mix of multiple choice and true/false' : config.questionTypes}
            ${config.hintsEnabled ? '- Include a helpful hint for each question' : ''}
            
            Response format:
            Return a JSON array where each question object has these exact properties:
            {
              "question": "string with the question text",
              "type": "multiple_choice" or "true_false",
              "options": ["array", "of", "possible", "answers"],
              "correctAnswer": "must match one of the options exactly",
              ${config.hintsEnabled ? '"hint": "helpful hint text",' : ''}
            }
            
            Important:
            - For multiple choice: provide exactly 4 options
            - For true/false: options must be exactly ["True", "False"]
            - Return ONLY the JSON array, no markdown, no extra text
            - Ensure the JSON is valid and properly formatted`
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
    console.log('Raw OpenAI response:', data.choices[0].message.content);

    let quiz;
    try {
      // Remove any potential markdown formatting and clean the string
      const cleanContent = data.choices[0].message.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      quiz = JSON.parse(cleanContent);
      
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
      console.error('Raw content:', data.choices[0].message.content);
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
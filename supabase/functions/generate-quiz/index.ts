
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Common types
interface QuizConfig {
  difficulty: "easy" | "medium" | "hard";
  questionTypes: "multiple_choice" | "true_false" | "mixed";
  timeLimit: number;
  numberOfQuestions: number;
  hintsEnabled: boolean;
}

interface Question {
  question: string;
  type: "multiple_choice" | "true_false";
  options: string[];
  correctAnswer: string;
  hint?: string;
}

// Quiz structure for OpenAI to follow
const quizStructurePrompt = `
You are an AI that generates educational quizzes based on lecture content.
Create a quiz with detailed questions, plausible answer options, and informative hints.
The output must follow this exact JSON format with no additional text:
{
  "quiz": [
    {
      "question": "Question text here?",
      "type": "multiple_choice", // or "true_false"
      "options": ["Option A", "Option B", "Option C", "Option D"], // For true_false, use ["True", "False"]
      "correctAnswer": "Option that is correct",
      "hint": "Helpful hint for the student"
    },
    // more questions...
  ]
}
`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const openAIKey = Deno.env.get("OPENAI_API_KEY") as string;

    if (!openAIKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request data
    const { lectureId, config } = await req.json();
    console.log("Generating quiz for lecture:", lectureId, "with config:", config);

    if (!lectureId || !config) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: 'User authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get lecture content
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture) {
      console.error("Lecture fetch error:", lectureError);
      return new Response(
        JSON.stringify({ error: 'Lecture not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI configurations if they exist
    const { data: aiConfig } = await supabase
      .from('lecture_ai_configs')
      .select('temperature, creativity_level, detail_level, content_language')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    // Generate quiz using OpenAI
    console.log("Generating quiz using OpenAI");
    const temperature = aiConfig?.temperature || 0.7;

    // Create a prompt for OpenAI that includes the lecture content and quiz config
    const prompt = `
${quizStructurePrompt}

LECTURE TITLE: ${lecture.title}
LECTURE CONTENT: ${lecture.content}

Generate a ${config.difficulty} difficulty quiz with ${config.numberOfQuestions} questions.
Question types: ${config.questionTypes === 'mixed' ? 'a mix of multiple-choice and true/false questions' : config.questionTypes + ' questions'}
${config.hintsEnabled ? 'Include helpful hints for each question.' : 'Do not include hints.'}
`;

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an educational quiz generator that creates quizzes based on lecture content.' },
          { role: 'user', content: prompt }
        ],
        temperature: temperature,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }
    
    const openAIData = await openAIResponse.json();
    const generatedText = openAIData.choices[0].message.content;
    
    // Parse the JSON response from OpenAI
    let quizData;
    try {
      // Sometimes OpenAI might include markdown code blocks, so we need to extract just the JSON
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : generatedText;
      quizData = JSON.parse(jsonString);
      
      // Validate the structure
      if (!quizData.quiz || !Array.isArray(quizData.quiz)) {
        throw new Error('Invalid quiz data structure');
      }
      
      // Ensure each question has the required fields
      quizData.quiz = quizData.quiz.map((q: any) => ({
        question: q.question,
        type: q.type,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        hint: config.hintsEnabled ? q.hint : undefined
      }));
      
      // Limit to requested number of questions
      if (quizData.quiz.length > config.numberOfQuestions) {
        quizData.quiz = quizData.quiz.slice(0, config.numberOfQuestions);
      }
      
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError, "Response:", generatedText);
      throw new Error('Failed to parse quiz data from OpenAI');
    }

    console.log(`Successfully generated quiz with ${quizData.quiz.length} questions`);

    // Store the generated quiz in the database
    const { data: storedQuiz, error: storeError } = await supabase
      .from('generated_quizzes')
      .insert({
        lecture_id: lectureId,
        user_id: user.id,
        config: config,
        quiz_data: quizData
      })
      .select('id')
      .single();

    if (storeError) {
      console.error("Error storing quiz:", storeError);
      return new Response(
        JSON.stringify({ error: 'Failed to store quiz' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        quiz: quizData.quiz,
        quizId: storedQuiz.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error in generate-quiz:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

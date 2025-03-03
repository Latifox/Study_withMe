
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

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

    // Generate quiz (without real AI for now, just mock data)
    const quiz = generateMockQuiz(config, lecture.title);
    console.log("Generated quiz with questions:", quiz.length);

    // Store the generated quiz in the database
    const { data: storedQuiz, error: storeError } = await supabase
      .from('generated_quizzes')
      .insert({
        lecture_id: lectureId,
        user_id: user.id,
        config: config,
        quiz_data: { quiz }
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
        quiz,
        quizId: storedQuiz.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Mock function to generate quizzes until we implement real AI generation
function generateMockQuiz(config: QuizConfig, lectureTitle: string): Question[] {
  const questions: Question[] = [];
  const { difficulty, questionTypes, numberOfQuestions, hintsEnabled } = config;

  console.log(`Generating ${numberOfQuestions} ${difficulty} questions about ${lectureTitle}`);

  // Generate questions based on configuration
  for (let i = 0; i < numberOfQuestions; i++) {
    // Determine question type
    let type: "multiple_choice" | "true_false";
    if (questionTypes === "mixed") {
      type = i % 2 === 0 ? "multiple_choice" : "true_false";
    } else {
      type = questionTypes as "multiple_choice" | "true_false";
    }

    // Generate question based on type
    if (type === "multiple_choice") {
      questions.push({
        question: `Multiple choice question ${i + 1} about ${lectureTitle}?`,
        type: "multiple_choice",
        options: [
          `Answer option A for question ${i + 1}`,
          `Answer option B for question ${i + 1}`,
          `Answer option C for question ${i + 1}`,
          `Answer option D for question ${i + 1}`
        ],
        correctAnswer: `Answer option ${String.fromCharCode(65 + (i % 4))} for question ${i + 1}`,
        hint: hintsEnabled ? `Hint for question ${i + 1}` : undefined
      });
    } else {
      questions.push({
        question: `True/False: Statement ${i + 1} about ${lectureTitle} is correct.`,
        type: "true_false",
        options: ["True", "False"],
        correctAnswer: i % 2 === 0 ? "True" : "False",
        hint: hintsEnabled ? `Hint for question ${i + 1}` : undefined
      });
    }
  }

  return questions;
}


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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
    const { lectureId, config } = await req.json();
    
    if (!lectureId) {
      console.error('Missing lecture ID');
      return new Response(
        JSON.stringify({ error: 'Missing lecture ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generate quiz request:', { lectureId, config });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture) {
      console.error('Error fetching lecture:', lectureError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch lecture content' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate quiz based on configuration
    const numQuestions = config.numberOfQuestions || 10;
    const difficulty = config.difficulty || 'medium';
    const questionTypes = config.questionTypes || 'mixed';
    const hintsEnabled = config.hintsEnabled === undefined ? true : config.hintsEnabled;

    // Generate quiz questions based on lecture content
    const quiz = await generateQuizQuestions(
      lecture.content, 
      lecture.title,
      numQuestions, 
      difficulty, 
      questionTypes, 
      hintsEnabled
    );

    // Get the user ID from the request
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the quiz in the database
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
      console.error('Error storing quiz:', storeError);
      // Continue despite storage error - we'll still return the quiz to the user
      console.log('Continuing despite storage error');
    } else {
      console.log('Quiz stored with ID:', storedQuiz.id);
    }

    return new Response(
      JSON.stringify({ quiz }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating quiz:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateQuizQuestions(
  lectureContent: string, 
  lectureTitle: string,
  numQuestions: number, 
  difficulty: string, 
  questionTypes: string,
  hintsEnabled: boolean
): Promise<any[]> {
  // For now, we'll create a simple mock implementation
  // In a real implementation, you'd use OpenAI or another service
  
  const questions = [];
  const questionTypesArray = questionTypes === 'mixed' 
    ? ['multiple_choice', 'true_false'] 
    : [questionTypes];
    
  for (let i = 0; i < numQuestions; i++) {
    const type = questionTypesArray[i % questionTypesArray.length];
    
    if (type === 'multiple_choice') {
      questions.push({
        question: `Question ${i + 1} about ${lectureTitle}?`,
        type: 'multiple_choice',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        hint: hintsEnabled ? `Hint for question ${i + 1}` : undefined
      });
    } else {
      questions.push({
        question: `True/False Question ${i + 1} about ${lectureTitle}?`,
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        hint: hintsEnabled ? `Hint for question ${i + 1}` : undefined
      });
    }
  }
  
  return questions;
}

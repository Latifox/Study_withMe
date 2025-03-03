
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.1'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@4.24.1'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Define the corsHeaders for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define type for the Question 
interface Question {
  question: string;
  type: "multiple_choice" | "true_false";
  options: string[];
  correctAnswer: string;
  hint?: string;
}

// Define the quiz response type
interface QuizData {
  quiz: Question[];
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});
const openai = new OpenAIApi(configuration);

// Serve HTTP requests
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestData = await req.json();
    const { lectureId, config } = requestData;
    
    console.log('Request data:', { lectureId, config: JSON.stringify(config) });

    if (!lectureId) {
      return new Response(
        JSON.stringify({ error: 'lectureId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch lecture content from database
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture) {
      console.error('Error fetching lecture:', lectureError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch lecture: ${lectureError?.message || 'Not found'}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Format the prompt based on the config
    const questionTypes = config.questionTypes || ['multiple_choice', 'true_false'];
    const difficultyLevel = config.difficultyLevel || 'medium';
    const numQuestions = config.numQuestions || 5;
    const hintsEnabled = config.hintsEnabled || false;
    const timeLimit = config.timeLimit || 15;

    const content = lecture.content || '';
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Lecture content is empty' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create the system prompt with detailed instructions
    const systemPrompt = `You are a quiz generator. Create a quiz based on the provided lecture content.
    The quiz should have ${numQuestions} questions of ${difficultyLevel} difficulty.
    Use only the following question types: ${questionTypes.join(', ')}.
    ${hintsEnabled ? 'Include helpful hints for each question.' : 'Do not include hints.'}
    For multiple-choice questions, provide 4 options with only one correct answer.
    For true/false questions, ensure the answer is clearly true or false.`;

    // Create the user prompt with the lecture content
    const userPrompt = `Create a quiz based on this lecture content: "${content}"`;

    // Generate the quiz using OpenAI
    const response = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      functions: [
        {
          name: 'generate_quiz',
          description: 'Generate a quiz based on lecture content',
          parameters: {
            type: 'object',
            properties: {
              quiz: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    question: { type: 'string' },
                    type: { type: 'string', enum: ['multiple_choice', 'true_false'] },
                    options: { type: 'array', items: { type: 'string' } },
                    correctAnswer: { type: 'string' },
                    hint: { type: 'string' }
                  },
                  required: ['question', 'type', 'options', 'correctAnswer']
                }
              }
            },
            required: ['quiz']
          }
        }
      ],
      function_call: { name: 'generate_quiz' }
    });

    // Parse the response
    const functionCall = response.choices[0].message.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error('Failed to generate quiz: Invalid response format');
    }

    const quizData = JSON.parse(functionCall.arguments) as QuizData;
    
    // Validate the quiz data
    if (!quizData.quiz || !Array.isArray(quizData.quiz) || quizData.quiz.length === 0) {
      throw new Error('Invalid quiz data: Quiz array is empty or malformed');
    }

    // Ensure each question has the required properties
    quizData.quiz.forEach((question, index) => {
      if (!question.question || !question.type || !question.options || !question.correctAnswer) {
        throw new Error(`Invalid question at index ${index}: Missing required properties`);
      }
      
      // For true/false questions, ensure options are only "True" and "False"
      if (question.type === 'true_false' && 
          (!question.options.includes('True') || !question.options.includes('False') || question.options.length !== 2)) {
        question.options = ['True', 'False'];
      }
      
      // Make sure the correct answer is one of the options
      if (!question.options.includes(question.correctAnswer)) {
        throw new Error(`Invalid question at index ${index}: Correct answer not in options`);
      }
    });

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Save the generated quiz to the database with proper config
    const { data: quizRecord, error: insertError } = await supabase
      .from('generated_quizzes')
      .insert({
        user_id: user.id,
        lecture_id: lectureId,
        quiz_data: quizData,
        config: {
          questionTypes,
          difficultyLevel,
          numQuestions,
          hintsEnabled,
          timeLimit
        }
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting quiz:', insertError);
      return new Response(
        JSON.stringify({ error: `Error inserting quiz: ${insertError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Return the generated quiz along with its ID
    return new Response(
      JSON.stringify({ quiz: quizData.quiz, quizId: quizRecord.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating quiz:', error);
    return new Response(
      JSON.stringify({ error: `Error generating quiz: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

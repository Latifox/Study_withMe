// Follow this setup guide to integrate the Deno runtime and the Supabase JS library with your project:
// https://deno.land/manual/examples/supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

// Import OpenAI SDK
import OpenAI from 'https://esm.sh/openai@4.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Question {
  question: string;
  type: "multiple_choice" | "true_false";
  options: string[];
  correctAnswer: string;
  hint?: string;
}

interface QuizData {
  quiz: Question[];
}

interface QuizConfig {
  difficulty: "easy" | "medium" | "hard";
  questionTypes: "multiple_choice" | "true_false" | "mixed";
  timeLimit: number;
  numberOfQuestions: number;
  hintsEnabled: boolean;
}

interface RequestBody {
  lectureId: number;
  config: QuizConfig;
}

interface OpenAIQuestionResponse {
  question: string;
  type: "multiple_choice" | "true_false";
  options: string[];
  correctAnswer: string;
  hint: string;
}

export const corsResponse = (body: unknown, status = 200) => {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    },
  );
};

// Handle CORS preflight requests
Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Create a supabase client with the Admin key to bypass RLS policies for accessing lecture data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    });

    const body: RequestBody = await req.json();
    const { lectureId, config } = body;

    console.log("Request body:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!lectureId || !config) {
      return corsResponse({ error: "Missing required fields" }, 400);
    }

    // Validate number of questions (adding this validation)
    if (config.numberOfQuestions < 1 || config.numberOfQuestions > 20) {
      return corsResponse({ error: "Number of questions must be between 1 and 20" }, 400);
    }

    // Get auth user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Authentication error:", userError);
      return corsResponse({ error: "Authentication required" }, 401);
    }

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabaseAdmin
      .from("lectures")
      .select("content, title")
      .eq("id", lectureId)
      .single();

    if (lectureError || !lecture) {
      console.error("Error fetching lecture:", lectureError);
      return corsResponse({ error: "Lecture not found" }, 404);
    }

    if (!lecture.content) {
      return corsResponse({ error: "Lecture has no content" }, 400);
    }

    console.log(`Generating quiz for lecture ${lectureId}, title: ${lecture.title}`);
    console.log(`Config: ${JSON.stringify(config, null, 2)}`);

    // Generate quiz using OpenAI
    const quizData = await generateQuizWithOpenAI(openai, lecture.content, config);

    // Insert quiz into the database
    const { data: quizRecord, error: insertError } = await supabaseAdmin
      .from("generated_quizzes")
      .insert({
        user_id: user.id,
        lecture_id: lectureId,
        quiz_data: quizData,
        config: config  // Store the config explicitly
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting quiz:", insertError);
      return corsResponse({ error: `Error inserting quiz: ${JSON.stringify(insertError)}` }, 500);
    }

    return corsResponse({
      quiz: quizData.quiz,
      quizId: quizRecord.id
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return corsResponse({ error: `Unexpected error: ${error.message}` }, 500);
  }
});

async function generateQuizWithOpenAI(
  openai: OpenAI,
  lectureContent: string,
  config: QuizConfig
): Promise<QuizData> {
  const { difficulty, questionTypes, numberOfQuestions, hintsEnabled } = config;

  // Determine the maximum content length to avoid exceeding token limits
  const maxContentLength = 10000;
  const truncatedContent = lectureContent.length > maxContentLength
    ? lectureContent.substring(0, maxContentLength)
    : lectureContent;

  console.log(`Using OpenAI to generate ${numberOfQuestions} ${difficulty} questions`);
  
  // Create a system message that specifies the format and requirements
  const systemMessage = `You are a quiz generator for educational content. 
Generate ${numberOfQuestions} ${difficulty} level questions based on the provided lecture content.
${questionTypes === "multiple_choice" ? "Create multiple-choice questions only."
  : questionTypes === "true_false" ? "Create true/false questions only."
  : "Create a mix of multiple-choice and true/false questions."}
${hintsEnabled ? "Include a helpful hint for each question." : "Do not include hints."}`;

  try {
    // Use OpenAI's function calling feature to get a structured response
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `Here is the lecture content to generate questions from:\n\n${truncatedContent}` }
      ],
      functions: [
        {
          name: "generate_quiz_questions",
          parameters: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                description: "Array of quiz questions",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string", description: "The question text" },
                    type: { type: "string", enum: ["multiple_choice", "true_false"], description: "Type of question" },
                    options: { 
                      type: "array", 
                      items: { type: "string" },
                      description: "Array of possible answers (for multiple_choice, include at least 4 options; for true_false, include exactly ['True', 'False'])"
                    },
                    correctAnswer: { type: "string", description: "The correct answer (must be one of the options)" },
                    hint: { type: "string", description: "A helpful hint for the question" }
                  },
                  required: ["question", "type", "options", "correctAnswer"]
                }
              }
            },
            required: ["questions"]
          }
        }
      ],
      function_call: { name: "generate_quiz_questions" }
    });

    // Parse the function call arguments
    if (response.choices[0]?.message?.function_call?.arguments) {
      const argsJson = response.choices[0].message.function_call.arguments;
      console.log("OpenAI response arguments:", argsJson);
      
      const parsedResponse = JSON.parse(argsJson);
      const questions = parsedResponse.questions as OpenAIQuestionResponse[];
      
      // Validate the questions
      const validatedQuestions = questions.map(q => {
        // Make sure true/false questions have exactly two options: True and False
        if (q.type === "true_false" && (!q.options || q.options.length !== 2)) {
          q.options = ["True", "False"];
        }
        
        // Ensure the correct answer is in the options
        if (!q.options.includes(q.correctAnswer)) {
          q.correctAnswer = q.options[0];
        }
        
        return q;
      });
      
      // Limit to the requested number of questions
      const limitedQuestions = validatedQuestions.slice(0, numberOfQuestions);
      
      return { quiz: limitedQuestions };
    } else {
      console.error("OpenAI response did not contain function call arguments", response);
      throw new Error("Failed to generate quiz questions");
    }
  } catch (error) {
    console.error("Error generating quiz with OpenAI:", error);
    throw error;
  }
}

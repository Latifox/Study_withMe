
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';

// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface GenerateQuizRequest {
  lectureId: number;
  config: {
    difficulty: "easy" | "medium" | "hard";
    questionTypes: "multiple_choice" | "true_false" | "mixed";
    timeLimit: number;
    numberOfQuestions: number;
    hintsEnabled: boolean;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: GenerateQuizRequest = await req.json();
    const { lectureId, config } = requestData;
    
    console.log(`Generating quiz for lecture ${lectureId} with config:`, config);

    // 1. Fetch the authenticated user's ID
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is missing');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User auth error:', userError);
      throw new Error('User authentication failed');
    }
    
    // 2. Fetch lecture content
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();
    
    if (lectureError || !lecture) {
      console.error('Lecture fetch error:', lectureError);
      throw new Error(`Failed to fetch lecture with ID ${lectureId}`);
    }
    
    // 3. Check if there's an existing quiz for this lecture and user
    const { data: existingQuizzes, error: quizError } = await supabase
      .from('generated_quizzes')
      .select('id, quiz_data')
      .eq('lecture_id', lectureId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (quizError) {
      console.error('Error checking for existing quizzes:', quizError);
    }
    
    // Return the existing quiz if available and not requesting a new one
    const recentQuiz = existingQuizzes && existingQuizzes.length > 0 ? existingQuizzes[0] : null;
    
    // 4. Generate a new quiz using OpenAI
    const lectureContent = lecture.content;
    
    // Prepare the prompt for OpenAI based on configuration
    let difficultyPrompt = "";
    switch (config.difficulty) {
      case "easy":
        difficultyPrompt = "Create beginner-friendly questions focusing on basic concepts. Use simpler language and more straightforward questions.";
        break;
      case "medium":
        difficultyPrompt = "Create moderately challenging questions that test understanding beyond basic recall.";
        break;
      case "hard":
        difficultyPrompt = "Create challenging questions that require deep understanding and application of concepts from the lecture.";
        break;
    }
    
    let questionTypePrompt = "";
    switch (config.questionTypes) {
      case "multiple_choice":
        questionTypePrompt = "Create ONLY multiple-choice questions with 4 options each.";
        break;
      case "true_false":
        questionTypePrompt = "Create ONLY true/false questions.";
        break;
      case "mixed":
        questionTypePrompt = "Create a mix of multiple-choice questions (with 4 options each) and true/false questions.";
        break;
    }
    
    let hintsPrompt = config.hintsEnabled ? 
      "Include a helpful hint for each question." : 
      "Do not include hints for questions.";
    
    const systemPrompt = `
      You are a professional quiz generator for educational content. 
      Generate a quiz based on the provided lecture content.
      ${difficultyPrompt}
      ${questionTypePrompt}
      ${hintsPrompt}
      Create exactly ${config.numberOfQuestions} questions.
      
      Format your response as a JSON array with the following structure:
      {
        "quiz": [
          {
            "question": "...",
            "type": "multiple_choice" or "true_false",
            "options": ["option1", "option2", ...] (for multiple_choice, provide 4 options),
            "correctAnswer": "exact text of the correct option",
            "hint": "..." (only if hints are enabled)
          },
          ...
        ]
      }
      
      Ensure all questions are directly based on the lecture content.
      Make sure the correctAnswer exactly matches one of the options.
      For true/false questions, options should be exactly ["True", "False"].
    `;
    
    // For safety, trim lecture content if it's too long
    const trimmedContent = lectureContent.length > 15000 ? 
      lectureContent.substring(0, 15000) + "..." : 
      lectureContent;
    
    console.log("Calling OpenAI with system prompt:", systemPrompt.substring(0, 200) + "...");
    
    // Make the API call to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a quiz based on this lecture content: ${trimmedContent}` }
        ],
        temperature: 0.7,
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const openAIResponse = await response.json();
    console.log("OpenAI response received");
    
    // Parse the response content as JSON
    const quizResultText = openAIResponse.choices[0].message.content;
    let quizData;
    
    try {
      // Try to extract JSON from the response in case it contains markdown formatting
      const jsonMatch = quizResultText.match(/```json\n([\s\S]*?)\n```/) || 
                        quizResultText.match(/{[\s\S]*}/);
      
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : quizResultText;
      quizData = JSON.parse(jsonString);
      
      // Validate quiz structure
      if (!quizData.quiz || !Array.isArray(quizData.quiz)) {
        throw new Error("Invalid quiz format: quiz array is missing");
      }
      
      // Ensure all questions have the required properties
      quizData.quiz = quizData.quiz.map(q => {
        if (!q.question || !q.type || !q.options || !q.correctAnswer) {
          console.warn("Question missing required fields:", q);
          throw new Error("Invalid question format: missing required fields");
        }
        
        // Ensure true/false questions have the correct options
        if (q.type === "true_false") {
          q.options = ["True", "False"];
          if (q.correctAnswer !== "True" && q.correctAnswer !== "False") {
            q.correctAnswer = q.correctAnswer.toLowerCase().includes("true") ? "True" : "False";
          }
        }
        
        // Add empty hint if hintsEnabled but no hint provided
        if (config.hintsEnabled && !q.hint) {
          q.hint = "Think about the key concepts discussed in the lecture.";
        }
        
        return q;
      });
      
      // Limit to requested number of questions
      if (quizData.quiz.length > config.numberOfQuestions) {
        quizData.quiz = quizData.quiz.slice(0, config.numberOfQuestions);
      }
      
    } catch (err) {
      console.error("Error parsing quiz result:", err);
      console.error("Raw response:", quizResultText);
      throw new Error("Failed to parse quiz result from OpenAI");
    }
    
    // 5. Store the quiz in the database
    const { data: insertedQuiz, error: insertError } = await supabase
      .from('generated_quizzes')
      .insert({
        user_id: user.id,
        lecture_id: lectureId,
        quiz_data: quizData
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error('Error inserting quiz:', insertError);
      throw new Error("Failed to save generated quiz to database");
    }
    
    // Return the quiz with its ID
    return new Response(
      JSON.stringify({
        quiz: quizData.quiz,
        quizId: insertedQuiz.id
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error generating quiz:", error.message || error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate quiz" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});

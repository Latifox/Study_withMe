import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { validateContent } from "./validator.ts";
import { saveSegmentContent } from "./db.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") as string;

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
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent, contentLanguage = 'english' } = await req.json();
    
    console.log(`Generating content for segment ${segmentNumber}: ${segmentTitle}`);
    console.log(`Content language: ${contentLanguage}`);

    // Generate theory content with updated prompt
    const theoryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an educational content generator. Generate theory content in JSON format only. Focus on clear, concise explanations."
          },
          {
            role: "user",
            content: `I'd like you to create theory slides using the following guidelines:
1. Create two theory slides: 
   - theory_slide_1: First slide covering the basic concepts
   - theory_slide_2: Second slide covering more advanced materials
2. Each theory slide focus on the following topic from the lecture: ${segmentTitle}
3. Use the following description to guide the focus of your slides: ${segmentDescription}
4. The content should be clear and concise, tailored to university-level students.
5. You will be acting as a professor teaching the subject with clarity.
6. Write content in this language: ${contentLanguage}
7. Use markdown format such as lists, bullet points, bolds, italics, quotes etc.
8. IMPORTANT: Focus ONLY on content related to the segment description and title, only use the following lecture content as a source: ${lectureContent}

Return ONLY a JSON object with the following format:
{
  "theory_slide_1": "First slide content explaining core concepts",
  "theory_slide_2": "Second slide content with examples and applications"
}

Keep each slide content concise and focused. Only include the requested fields.`
          }
        ],
        temperature: 0.7,
      }),
    });

    const theoryData = await theoryResponse.json();
    let theoryContent;
    
    try {
      theoryContent = JSON.parse(theoryData.choices[0].message.content);
    } catch (error) {
      console.error("Error parsing theory content:", error);
      theoryContent = {
        theory_slide_1: theoryData.choices[0].message.content.includes("theory_slide_1") 
          ? theoryData.choices[0].message.content 
          : "Error generating content. Please try again.",
        theory_slide_2: "Error parsing the generated content. Please try again."
      };
    }

    // Generate quiz content (keeping the existing prompt)
    const quizResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an educational quiz generator. Generate quiz questions in JSON format only. Focus on testing understanding of key concepts."
          },
          {
            role: "user",
            content: `Generate two quiz questions for a segment with title "${segmentTitle}" and description "${segmentDescription}". 
      Use this lecture content as reference: "${lectureContent.substring(0, 2000)}..."
      
      Return ONLY a JSON object with the following format:
      {
        "quiz_1_type": "multiple-choice",
        "quiz_1_question": "Question text",
        "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "quiz_1_correct_answer": "Correct option text",
        "quiz_1_explanation": "Explanation for the correct answer",
        "quiz_2_type": "true-false",
        "quiz_2_question": "Question text",
        "quiz_2_correct_answer": true or false,
        "quiz_2_explanation": "Explanation for the correct answer"
      }`
          }
        ],
        temperature: 0.7,
      }),
    });

    const quizData = await quizResponse.json();
    let quizContent;
    
    try {
      quizContent = JSON.parse(quizData.choices[0].message.content);
    } catch (error) {
      console.error("Error parsing quiz content:", error);
      quizContent = {
        quiz_1_type: "multiple-choice",
        quiz_1_question: "Error generating quiz. Please try again.",
        quiz_1_options: ["Option 1", "Option 2", "Option 3", "Option 4"],
        quiz_1_correct_answer: "Option 1",
        quiz_1_explanation: "Error generating content. Please try again.",
        quiz_2_type: "true-false",
        quiz_2_question: "Error generating quiz. Please try again.",
        quiz_2_correct_answer: true,
        quiz_2_explanation: "Error generating content. Please try again."
      };
    }

    // Combine the content
    const content = {
      ...theoryContent,
      ...quizContent
    };

    // Validate the generated content
    const validationResult = validateContent(content);
    if (!validationResult.valid) {
      throw new Error(`Invalid content generated: ${validationResult.errors.join(", ")}`);
    }

    // Save content to the database
    await saveSegmentContent(parseInt(lectureId), parseInt(segmentNumber), content);

    console.log("Content generated successfully");
    return new Response(
      JSON.stringify({ 
        success: true, 
        content 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating content:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const openAIApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

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
    // Get the request body
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent, isProfessorLecture, contentLanguage } = await req.json();
    
    console.log(`Generating content for segment ${segmentNumber}: ${segmentTitle}`);
    console.log(`Is professor lecture: ${isProfessorLecture ? 'yes' : 'no'}`);
    
    // Validate required parameters
    if (!lectureId || !segmentNumber || !segmentTitle || !lectureContent) {
      throw new Error('Missing required parameters: lectureId, segmentNumber, segmentTitle, lectureContent');
    }
    
    // Use the appropriate language or default to English
    const language = contentLanguage || 'english';
    console.log(`Using language: ${language}`);

    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate the content using OpenAI
    const prompt = `
You are an AI tutor creating educational content for a study segment titled "${segmentTitle}".
${segmentDescription ? `This segment covers: ${segmentDescription}` : ''}

The content is from a lecture document which includes the following text:
"""
${lectureContent.length > 8000 ? lectureContent.substring(0, 8000) + "..." : lectureContent}
"""

Based on the lecture content and the segment title/description, create educational content for this segment structured as follows. Please respond in ${language}.

1. Two theory slides:
   - theory_slide_1: About 150 words summarizing key concepts
   - theory_slide_2: About 150 words providing examples, applications, or deeper insights

2. Two quizzes:
   - Quiz 1: A multiple-choice question with 4 options
   - Quiz 2: A true/false question
   
Each quiz needs:
- A clear question
- For multiple choice: 4 answer options labeled A, B, C, D
- The correct answer
- A brief explanation of why the answer is correct

Respond with a JSON object with this structure:
{
  "theory_slide_1": "content...",
  "theory_slide_2": "content...",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "question text...",
  "quiz_1_options": ["A. option 1", "B. option 2", "C. option 3", "D. option 4"],
  "quiz_1_correct_answer": "letter of correct answer (A, B, C, or D)",
  "quiz_1_explanation": "explanation...",
  "quiz_2_type": "true_false",
  "quiz_2_question": "question text...",
  "quiz_2_correct_answer": "true or false",
  "quiz_2_explanation": "explanation..."
}

Do not include any other text or explanations outside this JSON structure.
`;

    console.log("Sending request to OpenAI...");
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Error from OpenAI:", data);
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const content = data.choices[0].message.content.trim();
    console.log("Received response from OpenAI");
    
    // Parse the JSON content
    try {
      // Find and extract the JSON part from the response
      let jsonContent = content;
      if (content.includes('{') && content.includes('}')) {
        jsonContent = content.substring(
          content.indexOf('{'),
          content.lastIndexOf('}') + 1
        );
      }
      
      const parsedContent = JSON.parse(jsonContent);

      // Store in appropriate table based on isProfessorLecture flag
      const tableName = isProfessorLecture ? 'professor_segments_content' : 'segments_content';
      
      const { data: insertData, error: insertError } = await supabase
        .from(tableName)
        .insert({
          lecture_id: parseInt(lectureId),
          sequence_number: parseInt(segmentNumber),
          theory_slide_1: parsedContent.theory_slide_1,
          theory_slide_2: parsedContent.theory_slide_2,
          quiz_1_type: parsedContent.quiz_1_type,
          quiz_1_question: parsedContent.quiz_1_question,
          quiz_1_options: parsedContent.quiz_1_options,
          quiz_1_correct_answer: parsedContent.quiz_1_correct_answer,
          quiz_1_explanation: parsedContent.quiz_1_explanation,
          quiz_2_type: parsedContent.quiz_2_type,
          quiz_2_question: parsedContent.quiz_2_question,
          quiz_2_correct_answer: parsedContent.quiz_2_correct_answer,
          quiz_2_explanation: parsedContent.quiz_2_explanation
        });

      if (insertError) {
        console.error(`Error inserting content into ${tableName}:`, insertError);
        throw insertError;
      }

      console.log(`Successfully stored content for segment ${segmentNumber} in ${tableName}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        content: parsedContent
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      console.error("OpenAI raw response:", content);
      throw new Error(`Failed to parse response: ${parseError.message}`);
    }
  } catch (error) {
    console.error("Error in generate-segment-content:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";

const openAiKey = Deno.env.get('OPENAI_API_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SegmentContent {
  theory_slide_1: string;
  theory_slide_2: string;
  quiz_1_type: "multiple_choice" | "true_false";
  quiz_1_question: string;
  quiz_1_options?: string[];
  quiz_1_correct_answer: string;
  quiz_1_explanation: string;
  quiz_2_type: "multiple_choice" | "true_false";
  quiz_2_question: string;
  quiz_2_options?: string[];
  quiz_2_correct_answer: string;
  quiz_2_explanation: string;
}

const openai = new OpenAI({
  apiKey: openAiKey,
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent } = await req.json();

    console.log(`Generating content for segment ${segmentNumber} of lecture ${lectureId}`);
    console.log('Segment title:', segmentTitle);
    console.log('Segment description:', segmentDescription);

    // First, generate the theory slides
    const theorySlidesPrompt = `
You are an AI professor assistant. Based on the following content and context, generate two concise, clear theory slides.
Focus on the most important concepts and explain them in a way that's easy to understand.

Context:
Title: "${segmentTitle}"
Description: "${segmentDescription}"

Content: "${lectureContent.substring(0, 8000)}"

Generate only a JSON object with exactly these two fields:
- slide_1: The content for the first theory slide
- slide_2: The content for the second theory slide

The slides should use markdown formatting. Keep each slide focused and concise.
DO NOT include any code block markers or other formatting around the JSON.
`;

    const theorySlidesResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful AI that generates educational content in JSON format." },
        { role: "user", content: theorySlidesPrompt }
      ],
      temperature: 0.7,
    });

    const theorySlides = JSON.parse(theorySlidesResponse.choices[0].message.content);

    // Then, generate the quizzes
    const quizzesPrompt = `
Based on the theory slides content, generate two quiz questions to test understanding.
The first question should be multiple choice, and the second should be true/false.

Theory content:
${theorySlides.slide_1}
${theorySlides.slide_2}

Generate only a JSON object with these fields for two quizzes:
Quiz 1 (multiple choice):
- question: The question text
- options: Array of 4 possible answers
- correct_answer: The correct option (must match exactly one of the options)
- explanation: Brief explanation of why this is correct

Quiz 2 (true/false):
- question: The question text
- correct_answer: Either "true" or "false"
- explanation: Brief explanation of why this is correct

DO NOT include any code block markers or other formatting around the JSON.
`;

    const quizzesResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful AI that generates educational quizzes in JSON format." },
        { role: "user", content: quizzesPrompt }
      ],
      temperature: 0.7,
    });

    const quizzes = JSON.parse(quizzesResponse.choices[0].message.content);

    // Combine the content into the required format
    const segmentContent: SegmentContent = {
      theory_slide_1: theorySlides.slide_1,
      theory_slide_2: theorySlides.slide_2,
      quiz_1_type: "multiple_choice",
      quiz_1_question: quizzes.quiz_1.question,
      quiz_1_options: quizzes.quiz_1.options,
      quiz_1_correct_answer: quizzes.quiz_1.correct_answer,
      quiz_1_explanation: quizzes.quiz_1.explanation,
      quiz_2_type: "true_false",
      quiz_2_question: quizzes.quiz_2.question,
      quiz_2_correct_answer: quizzes.quiz_2.correct_answer,
      quiz_2_explanation: quizzes.quiz_2.explanation,
    };

    // Save to Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/segments_content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'apikey': supabaseServiceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        lecture_id: lectureId,
        sequence_number: segmentNumber,
        ...segmentContent
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save segment content: ${response.statusText}`);
    }

    console.log(`Successfully generated and saved content for segment ${segmentNumber}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Content generated for segment ${segmentNumber}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-segment-content function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

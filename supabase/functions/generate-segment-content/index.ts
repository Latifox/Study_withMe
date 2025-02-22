
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      lectureId,
      segmentNumber,
      segmentTitle,
      segmentDescription,
      lectureContent
    } = await req.json();

    if (!lectureId || !segmentNumber || !segmentTitle || !segmentDescription || !lectureContent) {
      throw new Error('Missing required parameters');
    }

    console.log(`Generating content for segment ${segmentNumber} of lecture ${lectureId}`);
    console.log('Segment title:', segmentTitle);
    console.log('Segment description:', segmentDescription);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate the theory slides
    const slidesResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert educator who creates engaging and informative content for students. 
            Your task is to create two theory slides based on a specific segment of a lecture.
            Focus only on the content relevant to the segment's scope as defined by its title and description.
            Each slide should be concise, clear, and written in markdown format.
            Make sure to use proper headings, bullet points, and emphasis where appropriate.
            Include relevant examples and explanations that help students understand the concepts.`
          },
          {
            role: 'user',
            content: `Create two theory slides for a segment with the following context:
            Title: ${segmentTitle}
            Description: ${segmentDescription}
            
            Use this lecture content as source material:
            ${lectureContent}
            
            Format your response as a JSON object with two fields: slide1 and slide2.
            Each slide should be in markdown format.`
          }
        ],
        temperature: 0.7
      }),
    });

    const slidesData = await slidesResponse.json();
    const { slide1, slide2 } = JSON.parse(slidesData.choices[0].message.content);

    // Generate the quizzes
    const quizResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert educator who creates effective assessment questions.
            Create two quiz questions: one multiple-choice and one true/false question.
            The questions should test understanding of concepts covered in this specific segment.
            Questions should be clear, unambiguous, and focused on key learning objectives.`
          },
          {
            role: 'user',
            content: `Create two quiz questions for a segment with the following context:
            Title: ${segmentTitle}
            Description: ${segmentDescription}
            
            Based on this lecture content:
            ${lectureContent}
            
            Format your response as a JSON object with these fields:
            {
              "multipleChoice": {
                "question": "string",
                "options": ["string", "string", "string", "string"],
                "correctAnswer": "string",
                "explanation": "string"
              },
              "trueFalse": {
                "question": "string",
                "correctAnswer": boolean,
                "explanation": "string"
              }
            }`
          }
        ],
        temperature: 0.7
      }),
    });

    const quizData = await quizResponse.json();
    const { multipleChoice, trueFalse } = JSON.parse(quizData.choices[0].message.content);

    // Create or update the segment content in the database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: upsertError } = await supabaseClient
      .from('segments_content')
      .upsert({
        lecture_id: lectureId,
        sequence_number: segmentNumber,
        theory_slide_1: slide1,
        theory_slide_2: slide2,
        quiz_1_type: 'multiple_choice',
        quiz_1_question: multipleChoice.question,
        quiz_1_options: multipleChoice.options,
        quiz_1_correct_answer: multipleChoice.correctAnswer,
        quiz_1_explanation: multipleChoice.explanation,
        quiz_2_type: 'true_false',
        quiz_2_question: trueFalse.question,
        quiz_2_correct_answer: trueFalse.correctAnswer,
        quiz_2_explanation: trueFalse.explanation
      }, {
        onConflict: 'lecture_id,sequence_number'
      });

    if (upsertError) {
      console.error('Error upserting segment content:', upsertError);
      throw upsertError;
    }

    console.log(`Successfully generated and saved content for segment ${segmentNumber}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

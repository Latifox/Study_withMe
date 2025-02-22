
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting generate-segment-content function');
    const {
      lectureId,
      segmentNumber,
      segmentTitle,
      segmentDescription,
      lectureContent
    } = await req.json();

    console.log(`Processing segment ${segmentNumber} for lecture ${lectureId}`);
    console.log('Segment title:', segmentTitle);
    console.log('Segment description:', segmentDescription);

    if (!lectureId || !segmentNumber || !segmentTitle || !segmentDescription || !lectureContent) {
      throw new Error('Missing required parameters');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Generate the theory slides
    console.log('Generating theory slides...');
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
            content: 'You are an expert educator who creates clear, engaging theory slides based on lecture content. Each slide should be concise yet comprehensive.'
          },
          {
            role: 'user',
            content: `Create two theory slides for a segment with title "${segmentTitle}" and description "${segmentDescription}". 
            Use this lecture content as reference: "${lectureContent}".
            
            Return the slides in this exact JSON format:
            {
              "slide1": "First slide content",
              "slide2": "Second slide content"
            }
            
            Keep each slide focused, clear, and directly related to the segment topic.
            Do not include any markdown or special formatting.
            Slides should build upon each other logically.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!slidesResponse.ok) {
      const errorText = await slidesResponse.text();
      console.error('OpenAI API error (slides):', errorText);
      throw new Error(`OpenAI API error: ${slidesResponse.status} ${errorText}`);
    }

    const slidesData = await slidesResponse.json();
    if (!slidesData.choices?.[0]?.message?.content) {
      console.error('Invalid slides response:', slidesData);
      throw new Error('Invalid response format from OpenAI API (slides)');
    }

    console.log('Theory slides generated successfully');
    const { slide1, slide2 } = JSON.parse(slidesData.choices[0].message.content);

    // Generate the quizzes
    console.log('Generating quizzes...');
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
            content: 'You are an expert at creating educational assessments that test understanding of lecture content effectively.'
          },
          {
            role: 'user',
            content: `Create two quiz questions for a segment with title "${segmentTitle}" and description "${segmentDescription}".
            Use this lecture content as reference: "${lectureContent}".
            
            Create:
            1. One multiple-choice question with exactly 4 options
            2. One true/false question
            
            Return in this exact JSON format:
            {
              "multipleChoice": {
                "question": "Question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": "Correct option text",
                "explanation": "Explanation of the correct answer"
              },
              "trueFalse": {
                "question": "Question text",
                "correctAnswer": true or false,
                "explanation": "Explanation of the correct answer"
              }
            }
            
            Questions should test understanding of key concepts from the slides.
            Make sure questions are challenging but fair.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!quizResponse.ok) {
      const errorText = await quizResponse.text();
      console.error('OpenAI API error (quiz):', errorText);
      throw new Error(`OpenAI API error: ${quizResponse.status} ${errorText}`);
    }

    const quizData = await quizResponse.json();
    if (!quizData.choices?.[0]?.message?.content) {
      console.error('Invalid quiz response:', quizData);
      throw new Error('Invalid response format from OpenAI API (quiz)');
    }

    console.log('Quizzes generated successfully');
    const { multipleChoice, trueFalse } = JSON.parse(quizData.choices[0].message.content);

    // Create the Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First check if the content already exists
    console.log('Checking existing content...');
    const { data: existingContent, error: fetchError } = await supabaseClient
      .from('segments_content')
      .select('*')
      .eq('lecture_id', lectureId)
      .eq('sequence_number', segmentNumber)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing content:', fetchError);
      throw fetchError;
    }

    console.log('Saving content to database...');
    const contentData = {
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
    };

    const { error: upsertError } = await supabaseClient
      .from('segments_content')
      .upsert(contentData);

    if (upsertError) {
      console.error('Error upserting content:', upsertError);
      throw upsertError;
    }

    console.log('Content successfully saved to database');
    return new Response(
      JSON.stringify({ success: true, message: 'Content generated and saved successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

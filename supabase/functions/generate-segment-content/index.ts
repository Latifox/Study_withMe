
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.2';
import { generateSegmentContent } from './generator.ts';
import { validateContent } from './validator.ts';

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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    // Parse request body
    const requestData = await req.json();
    const { 
      lectureId, 
      segmentNumber, 
      segmentTitle, 
      segmentDescription, 
      lectureContent,
      contentLanguage = 'english'
    } = requestData;

    console.log(`Processing request for segment ${segmentNumber} of lecture ${lectureId}`);
    console.log(`Title: ${segmentTitle}, Description: ${segmentDescription}, Language: ${contentLanguage}`);
    
    if (!lectureId || !segmentNumber || !segmentTitle) {
      throw new Error('Missing required parameters');
    }

    // Generate the segment content
    const segmentContent = await generateSegmentContent({
      content: lectureContent,
      title: segmentTitle,
      description: segmentDescription,
      language: contentLanguage
    });

    // Validate the generated content
    validateContent(segmentContent);
    
    console.log('Content generated and validated successfully');
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Store in segments_content table
    console.log(`Saving content to segments_content table for lecture ${lectureId}, segment ${segmentNumber}`);
    
    const { data, error } = await supabase
      .from('segments_content')
      .upsert({
        lecture_id: lectureId,
        sequence_number: segmentNumber,
        theory_slide_1: segmentContent.theory_slide_1,
        theory_slide_2: segmentContent.theory_slide_2,
        quiz_1_type: segmentContent.quiz_1_type,
        quiz_1_question: segmentContent.quiz_1_question,
        quiz_1_options: segmentContent.quiz_1_options,
        quiz_1_correct_answer: segmentContent.quiz_1_correct_answer,
        quiz_1_explanation: segmentContent.quiz_1_explanation,
        quiz_2_type: segmentContent.quiz_2_type,
        quiz_2_question: segmentContent.quiz_2_question,
        quiz_2_correct_answer: segmentContent.quiz_2_correct_answer,
        quiz_2_explanation: segmentContent.quiz_2_explanation
      })
      .select();

    if (error) {
      console.error('Error saving segment content to database:', error);
      throw error;
    }

    console.log('Content saved to segments_content table successfully');

    return new Response(
      JSON.stringify({
        success: true,
        content: segmentContent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in generate-segment-content function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface SegmentRequest {
  lectureId: number;
  segmentNumber: number;
  segmentTitle?: string;
  segmentDescription?: string;
  lectureContent?: string;
}

interface GeneratedContent {
  theory_slide_1: string;
  theory_slide_2: string;
  quiz_1_type: "multiple_choice" | "true_false";
  quiz_1_question: string;
  quiz_1_options?: string[];
  quiz_1_correct_answer: string | boolean;
  quiz_1_explanation: string;
  quiz_2_type: "multiple_choice" | "true_false";
  quiz_2_question: string;
  quiz_2_correct_answer: string | boolean;
  quiz_2_explanation: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent } = await req.json() as SegmentRequest;
    console.log('Received request for lecture:', lectureId, 'segment:', segmentNumber);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Generate content using the lecture content and segment details
    // For now, we'll generate some placeholder content
    const generatedContent: GeneratedContent = {
      theory_slide_1: "Let's start with understanding the basic concepts...",
      theory_slide_2: "Now let's look at some practical applications...",
      quiz_1_type: "multiple_choice",
      quiz_1_question: "What is the main concept discussed in this segment?",
      quiz_1_options: ["Option A", "Option B", "Option C", "Option D"],
      quiz_1_correct_answer: "Option A",
      quiz_1_explanation: "This is the correct answer because...",
      quiz_2_type: "true_false",
      quiz_2_question: "Is this statement correct?",
      quiz_2_correct_answer: true,
      quiz_2_explanation: "This statement is true because..."
    };

    // Save content to database
    const { error: dbError } = await supabaseClient
      .from('segments_content')
      .upsert({
        lecture_id: lectureId,
        sequence_number: segmentNumber,
        ...generatedContent
      });

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ success: true, content: generatedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

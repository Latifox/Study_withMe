
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { ContentGenerator, GeneratedContent } from "./generator.ts";

interface SegmentRequest {
  lectureId: number;
  segmentNumber: number;
  segmentTitle: string;
  segmentDescription: string;
  lectureContent: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent } = await req.json() as SegmentRequest;
    console.log('Received request for lecture:', lectureId, 'segment:', segmentNumber);
    console.log('Segment title:', segmentTitle);
    console.log('Content length:', lectureContent?.length || 0);

    if (!lectureId || !segmentNumber || !segmentTitle || !segmentDescription || !lectureContent) {
      throw new Error('Missing required parameters');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Generate content using our ContentGenerator
    const generator = new ContentGenerator();
    const generatedContent = await generator.generateContent({
      title: segmentTitle,
      description: segmentDescription,
      lectureContent: lectureContent,
    });

    console.log('Content generated successfully, saving to database...');

    // Save content to database
    const { error: dbError } = await supabaseClient
      .from('segments_content')
      .upsert({
        lecture_id: lectureId,
        sequence_number: segmentNumber,
        ...generatedContent
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('Content saved successfully');

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

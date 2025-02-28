
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { generateSegmentContent } from './generator.ts';
import { saveSegmentContent } from './db.ts';

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
    const { content, title, description, language, lectureId, segmentNumber } = await req.json();
    
    console.log(`Generating content for segment ${segmentNumber} of lecture ${lectureId}`);
    console.log(`Title: ${title}, Description: ${description}, Language: ${language || 'en'}`);
    
    // Generate the segment content
    const segmentContent = await generateSegmentContent({
      content,
      title,
      description,
      language: language || 'en'
    });
    
    console.log('Content generated successfully');
    
    // If lectureId and segmentNumber are provided, save to database
    if (lectureId && segmentNumber) {
      console.log(`Saving content to database for lecture ${lectureId}, segment ${segmentNumber}`);
      await saveSegmentContent(lectureId, segmentNumber, segmentContent);
      console.log('Content saved to database');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: segmentContent
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


import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { generateSegmentContent } from './generator.ts';
import { ApiResponse } from './types.ts';

// CORS headers for browser requests
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
    // Parse the request body
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent, contentLanguage } = await req.json();
    
    // Validate required parameters
    if (!lectureId || !segmentNumber || !segmentTitle || !segmentDescription || !lectureContent) {
      console.error('Missing required parameters:', { lectureId, segmentNumber, segmentTitle, segmentDescription });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Processing request for lecture ${lectureId}, segment ${segmentNumber}`);
    
    // Generate content for the segment
    const result: ApiResponse = await generateSegmentContent(
      lectureId,
      segmentNumber,
      segmentTitle,
      segmentDescription,
      lectureContent,
      contentLanguage || 'english'
    );
    
    if (!result.success) {
      console.error(`Failed to generate content: ${result.error}`);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('Successfully generated content');
    
    // Return the successful response
    return new Response(
      JSON.stringify({
        success: true,
        content: result.content
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Unexpected error in generate-segment-content:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unexpected error: ${error.message}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

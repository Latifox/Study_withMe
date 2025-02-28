
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateSegmentContent } from "./generator.ts";

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
    
    // Log the input parameters for debugging
    console.log('Received parameters:', { 
      lectureId, 
      segmentNumber, 
      segmentTitle, 
      segmentDescription,
      contentLength: lectureContent ? lectureContent.length : 0,
      contentLanguage 
    });

    // Validate input parameters
    if (!lectureId || segmentNumber === undefined || !segmentTitle || !segmentDescription) {
      console.error('Missing required parameters:', { lectureId, segmentNumber, segmentTitle, segmentDescription });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          missingParams: {
            lectureId: !lectureId,
            segmentNumber: segmentNumber === undefined,
            segmentTitle: !segmentTitle,
            segmentDescription: !segmentDescription
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate content using the provided parameters
    const content = await generateSegmentContent({
      content: lectureContent,
      title: segmentTitle,
      description: segmentDescription,
      language: contentLanguage
    });

    // Return the generated content
    return new Response(
      JSON.stringify({ content }),
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

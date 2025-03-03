
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { validateRequest } from "./validator.ts";
import { generateSegmentContent } from "./generator.ts";
import { updateSegmentContent } from "./db.ts";
import { SegmentContentRequest } from "./types.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request for segment content generation');
    
    // Parse request body
    const requestData: SegmentContentRequest = await req.json();
    console.log('Request data received:', {
      lectureId: requestData.lectureId,
      segmentNumber: requestData.segmentNumber,
      isProfessorLecture: requestData.isProfessorLecture
    });
    
    // Validate request data
    const validationResult = validateRequest(requestData);
    if (!validationResult.isValid) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate content using OpenAI
    console.log('Generating content for segment', requestData.segmentNumber);
    const { content, error: generationError } = await generateSegmentContent(requestData);
    
    if (generationError) {
      console.error('Content generation error:', generationError);
      return new Response(
        JSON.stringify({ error: generationError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!content) {
      console.error('No content generated');
      return new Response(
        JSON.stringify({ error: 'Failed to generate content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Update the database with generated content
    console.log('Updating database with generated content');
    const { error: dbError } = await updateSegmentContent(requestData, content);
    
    if (dbError) {
      console.error('Database update error:', dbError);
      return new Response(
        JSON.stringify({ error: `Database error: ${dbError}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Content generation and database update successful');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Unhandled error in segment content generation:', error);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

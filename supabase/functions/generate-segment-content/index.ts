
// Import necessary modules and functions
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { generateSegmentContent } from "./generator.ts";
import { validateRequest } from "./validator.ts";
import { insertProfessorSegmentContent, insertSegmentContent } from "./db.ts";

// Define CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Start the server using the serve function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body as JSON
    const requestData = await req.json();
    
    // Validate the request data
    const validationResult = validateRequest(requestData);
    if (!validationResult.valid) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Extract parameters from the validated request
    const { 
      lectureId, 
      segmentNumber, 
      segmentTitle, 
      segmentDescription, 
      lectureContent,
      isProfessorLecture = false
    } = requestData;

    console.log(`Processing segment ${segmentNumber} for lecture ${lectureId} (Professor: ${isProfessorLecture})`);
    console.log(`Title: ${segmentTitle}`);
    console.log(`Description: ${segmentDescription}`);
    
    // Generate content for the segment
    const segmentContent = await generateSegmentContent(
      segmentTitle,
      segmentDescription,
      lectureContent
    );

    // Save the generated content to the database
    if (isProfessorLecture) {
      await insertProfessorSegmentContent(
        lectureId,
        segmentNumber,
        segmentContent
      );
    } else {
      await insertSegmentContent(
        lectureId,
        segmentNumber,
        segmentContent
      );
    }

    // Return a success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Content for segment ${segmentNumber} generated and saved successfully` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log and return any errors
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate segment content', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

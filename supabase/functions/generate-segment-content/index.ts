
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
  console.log("Generate segment content function called");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body as JSON
    const requestData = await req.json();
    console.log("Request data received:", JSON.stringify(requestData).substring(0, 200) + "...");
    
    // Validate the request data
    const validationResult = validateRequest(requestData);
    if (!validationResult.valid) {
      console.error("Validation error:", validationResult.error);
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
      isProfessorLecture = false,
      contentLanguage = "english"
    } = requestData;

    console.log(`Processing segment ${segmentNumber} for lecture ${lectureId} (Professor: ${isProfessorLecture})`);
    console.log(`Title: ${segmentTitle}`);
    console.log(`Description: ${segmentDescription?.substring(0, 50)}...`);
    console.log(`Content language: ${contentLanguage}`);
    
    // Generate content for the segment
    console.log("Generating segment content...");
    const segmentContent = await generateSegmentContent(
      segmentTitle,
      segmentDescription,
      lectureContent,
      contentLanguage
    );
    console.log("Content generated successfully");

    // Save the generated content to the database
    console.log("Saving content to database...");
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
    console.log("Content saved successfully");

    // Return a success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Content for segment ${segmentNumber} generated and saved successfully`,
        content: segmentContent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log and return any errors
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate segment content', 
        details: error.message || 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

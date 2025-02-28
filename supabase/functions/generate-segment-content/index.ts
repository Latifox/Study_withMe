
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { generateSegmentContent } from "./generator.ts";
import { verifyParameters } from "./validator.ts";
import { saveFunctionExecutionData } from "./db.ts";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    const requestBody = await req.json();
    
    console.log("Received request:", JSON.stringify(requestBody, null, 2));
    
    // Validate parameters
    const { 
      lectureId, 
      segmentNumber, 
      segmentTitle, 
      segmentDescription, 
      lectureContent, 
      contentLanguage 
    } = verifyParameters(requestBody);
    
    console.log(`Processing segment ${segmentNumber} for lecture ${lectureId}`);
    console.log(`Title: ${segmentTitle}`);
    console.log(`Description: ${segmentDescription}`);
    console.log(`Language: ${contentLanguage}`);
    
    // Log first 100 chars of lecture content for debugging
    if (lectureContent) {
      console.log(`Lecture content (first 100 chars): ${lectureContent.substring(0, 100)}...`);
    } else {
      console.log("Lecture content is missing or empty");
    }

    // Record function execution start time
    const startTime = Date.now();
    
    try {
      // Generate content
      const content = await generateSegmentContent(
        lectureId,
        segmentNumber,
        segmentTitle,
        segmentDescription,
        lectureContent,
        contentLanguage
      );
      
      // Record execution data
      const executionTime = Date.now() - startTime;
      await saveFunctionExecutionData(
        lectureId, 
        segmentNumber, 
        executionTime, 
        true, 
        "Success"
      );
      
      return new Response(
        JSON.stringify({ content }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (error) {
      // Record execution failure
      const executionTime = Date.now() - startTime;
      await saveFunctionExecutionData(
        lectureId, 
        segmentNumber, 
        executionTime, 
        false, 
        error.message
      );
      
      throw error;
    }
  } catch (error) {
    console.error("Error in generate-segment-content function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

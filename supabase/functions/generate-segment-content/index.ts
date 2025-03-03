
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./_shared/cors.ts";
import { validateRequest } from "./validator.ts";
import { generateSegmentContent } from "./generator.ts";
import { updateSegmentContent } from "./db.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const requestData = await req.json();
    console.log("Request received:", JSON.stringify(requestData));

    // Validate the request
    const validationResult = validateRequest(requestData);
    if (!validationResult.valid) {
      console.error("Validation error:", validationResult.error);
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent, isProfessorLecture, contentLanguage } = requestData;

    // Generate segment content
    console.log(`Generating content for segment ${segmentNumber}: ${segmentTitle}`);
    const content = await generateSegmentContent(
      segmentTitle,
      segmentDescription,
      lectureContent,
      contentLanguage || 'english'
    );

    if (!content) {
      throw new Error("Failed to generate segment content");
    }

    // Save the content to the database
    console.log("Saving generated content to database");
    await updateSegmentContent(
      lectureId,
      segmentNumber,
      content,
      isProfessorLecture === true
    );

    // Return a success response
    return new Response(
      JSON.stringify({ success: true, content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-segment-content:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

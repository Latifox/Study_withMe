
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateRequest } from './validator.ts';
import { generateSegmentContent } from './generator.ts';
import { corsHeaders } from "../_shared/cors.ts";

console.log("Generate Segment Content function started");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Request body:', requestBody);

    // Validate the request body
    const validationResult = validateRequest(requestBody);
    if (!validationResult.valid) {
      console.error('Validation error:', validationResult.error);
      return new Response(JSON.stringify({ error: validationResult.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent, contentLanguage } = requestBody;

    // Generate the segment content
    const result = await generateSegmentContent(
      lectureId,
      segmentNumber,
      segmentTitle,
      segmentDescription,
      lectureContent,
      contentLanguage
    );

    if (!result.success) {
      console.error('Content generation error:', result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Respond with the generated content
    console.log('Content generated successfully');
    return new Response(
      JSON.stringify({ data: result.content }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

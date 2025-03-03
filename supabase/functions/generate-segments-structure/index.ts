
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers for browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  console.log("[generate-segments-structure] Function called");

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("[generate-segments-structure] Handling OPTIONS request for CORS");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get the request body
    const requestData = await req.json();
    const { lectureId, lectureContent, lectureTitle } = requestData;

    console.log(`[generate-segments-structure] Processing lecture ID: ${lectureId}, title: ${lectureTitle}`);
    console.log(`[generate-segments-structure] Content length: ${lectureContent?.length || 0} characters`);
    
    if (!lectureId || !lectureContent) {
      console.error("[generate-segments-structure] Missing required parameters: lectureId or lectureContent");
      return new Response(
        JSON.stringify({ error: "Missing required parameters", details: { lectureId, contentLength: lectureContent?.length || 0 } }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("[generate-segments-structure] Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing Supabase credentials" }),
        { status: 500, headers: corsHeaders }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Call OpenAI to analyze the content and suggest segments
    console.log("[generate-segments-structure] Preparing to call OpenAI for segment generation");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      console.error("[generate-segments-structure] OpenAI API key not found");
      return new Response(
        JSON.stringify({ error: "Server configuration error: OpenAI API key not found" }),
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Limit content length to avoid token limits
    const truncatedContent = lectureContent.substring(0, 12000);
    
    // Create a prompt for the GPT model
    const prompt = `
    You are an educational content analyzer. Your task is to divide the following lecture into logical segments or chapters.
    
    Lecture Title: ${lectureTitle}
    
    For each segment, provide:
    1. A short, descriptive title (max 100 characters)
    2. A brief description summarizing what this segment covers (max 250 characters)
    
    Aim for 3-8 segments depending on the content length and complexity.
    
    Please format your response as a valid JSON array:
    [
      {
        "title": "Segment title",
        "description": "Brief description of the segment content"
      },
      ...more segments
    ]
    
    DO NOT include any explanations or text outside the JSON array. Return ONLY the JSON array.
    
    Here is the lecture content:
    ${truncatedContent}
    `;
    
    console.log("[generate-segments-structure] Calling OpenAI API");
    console.log("[generate-segments-structure] Using model: gpt-4o-mini");
    
    try {
      const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",  // Using a reliable model for this task
          messages: [
            {
              role: "system",
              content: "You are an AI that helps divide educational content into logical segments."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3  // Lower temperature for more consistent results
        })
      });
      
      if (!openAIResponse.ok) {
        const errorData = await openAIResponse.text();
        console.error("[generate-segments-structure] OpenAI API error:", errorData);
        return new Response(
          JSON.stringify({ error: "OpenAI API error", details: errorData }),
          { status: 500, headers: corsHeaders }
        );
      }
      
      const openAIData = await openAIResponse.json();
      console.log("[generate-segments-structure] Received response from OpenAI");
      
      // Extract the response content
      const segmentsText = openAIData.choices[0].message.content.trim();
      console.log("[generate-segments-structure] Raw OpenAI response:", segmentsText.substring(0, 200) + "...");
      
      let segments;
      try {
        // Try to parse the JSON response
        // Sometimes OpenAI adds markdown code blocks, so we need to extract just the JSON
        const jsonMatch = segmentsText.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          segments = JSON.parse(jsonMatch[0]);
        } else {
          segments = JSON.parse(segmentsText);
        }
        
        console.log(`[generate-segments-structure] Successfully parsed ${segments.length} segments`);
      } catch (parseError) {
        console.error("[generate-segments-structure] Error parsing OpenAI response:", parseError);
        console.error("[generate-segments-structure] Raw response:", segmentsText);
        return new Response(
          JSON.stringify({ 
            error: "Failed to parse segments from OpenAI response", 
            details: parseError.message,
            rawResponse: segmentsText
          }),
          { status: 500, headers: corsHeaders }
        );
      }
      
      // Start a transaction to store all segments
      const storedSegments = [];
      
      console.log("[generate-segments-structure] Storing segments in database");
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const sequenceNumber = i + 1;
        
        // Insert the segment into the database
        const { data, error } = await supabase
          .from('lecture_segments')
          .insert({
            lecture_id: parseInt(lectureId),
            title: segment.title,
            segment_description: segment.description,
            sequence_number: sequenceNumber
          })
          .select()
          .single();
          
        if (error) {
          console.error(`[generate-segments-structure] Error inserting segment ${sequenceNumber}:`, error);
          return new Response(
            JSON.stringify({ 
              error: "Database error when storing segments", 
              details: error,
              segmentData: { 
                lecture_id: parseInt(lectureId),
                title: segment.title,
                description: segment.description,
                sequence_number: sequenceNumber
              }
            }),
            { status: 500, headers: corsHeaders }
          );
        }
        
        storedSegments.push(data);
      }
      
      console.log(`[generate-segments-structure] Successfully stored ${storedSegments.length} segments`);
      
      // Return the created segments
      return new Response(
        JSON.stringify({ success: true, segments: storedSegments }),
        { status: 200, headers: corsHeaders }
      );
    } catch (openAIError) {
      console.error("[generate-segments-structure] Error calling OpenAI:", openAIError);
      return new Response(
        JSON.stringify({ error: "Error communicating with OpenAI", details: openAIError.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("[generate-segments-structure] Error processing request:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred during segment generation",
        stack: error.stack // Include stack for debugging
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

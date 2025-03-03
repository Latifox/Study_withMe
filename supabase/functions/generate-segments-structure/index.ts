
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
  console.log("generate-segments-structure function called");

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request for CORS");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get the request body
    const requestData = await req.json();
    const { lectureId, lectureContent, lectureTitle } = requestData;

    console.log(`Processing lecture ID: ${lectureId}, title: ${lectureTitle}`);
    
    if (!lectureId || !lectureContent) {
      console.error("Missing required parameters: lectureId or lectureContent");
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Call OpenAI to analyze the content and suggest segments
    console.log("Preparing to call OpenAI for segment generation");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not found");
    }
    
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
    ${lectureContent.substring(0, 15000)} // Limit to 15K chars to avoid token limits
    `;
    
    console.log("Calling OpenAI API");
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
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${errorData}`);
    }
    
    const openAIData = await openAIResponse.json();
    console.log("Received response from OpenAI");
    
    // Extract the response content
    const segmentsText = openAIData.choices[0].message.content.trim();
    
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
      
      console.log(`Successfully parsed ${segments.length} segments`);
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      console.error("Raw response:", segmentsText);
      throw new Error("Failed to parse segments from OpenAI response");
    }
    
    // Start a transaction to store all segments
    const storedSegments = [];
    
    console.log("Storing segments in database");
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
        console.error(`Error inserting segment ${sequenceNumber}:`, error);
        throw error;
      }
      
      storedSegments.push(data);
    }
    
    console.log(`Successfully stored ${storedSegments.length} segments`);
    
    // Return the created segments
    return new Response(
      JSON.stringify({ success: true, segments: storedSegments }),
      { status: 200, headers: corsHeaders }
    );
    
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred during segment generation",
        stack: error.stack // Include stack for debugging
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

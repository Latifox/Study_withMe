
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Set up Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Set up OpenAI client
const openAIApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

serve(async (req) => {
  console.log("Request received for generate-professor-segments-structure");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request (CORS preflight)");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`Method not allowed: ${req.method}`);
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      status: 405
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse request body
    const requestData = await req.json();
    console.log("Request body received:", JSON.stringify(requestData));

    // Validate required fields
    const { lectureId, lectureContent, lectureTitle } = requestData;
    
    if (!lectureId) {
      throw new Error('Missing required field: lectureId');
    }
    
    if (!lectureContent) {
      throw new Error('Missing required field: lectureContent');
    }

    if (!lectureTitle) {
      throw new Error('Missing required field: lectureTitle');
    }

    // Limit content to avoid token issues
    const maxContentLength = 30000;
    const trimmedContent = lectureContent.length > maxContentLength
      ? `${lectureContent.substring(0, maxContentLength)} [Content was trimmed due to length]`
      : lectureContent;

    console.log(`Processing professor lecture ID: ${lectureId}, title: ${lectureTitle}`);
    console.log(`Content length: ${trimmedContent.length} characters`);

    // Call OpenAI API to process the lecture content
    console.log("Calling OpenAI API...");
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an AI designed to analyze lecture content and create a structured learning experience. Your task is to divide the lecture into logical segments, each with a title and concise description."
          },
          {
            role: "user",
            content: `Analyze this lecture titled "${lectureTitle}" and divide it into 5-10 logical segments for a learning platform. For each segment, provide a title and a brief description outlining what the segment covers.

The lecture content is as follows:
${trimmedContent}

Return your response as a JSON array where each segment has:
1. sequence_number: A number from 1 to N in order
2. title: A concise, descriptive title for the segment
3. segment_description: A brief description of what this segment covers (2-3 sentences)

Format your response as a valid JSON array without any additional text before or after.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.5,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    console.log("OpenAI response received");
    
    if (!openAIData.choices || !openAIData.choices[0] || !openAIData.choices[0].message) {
      console.error("Unexpected OpenAI response format:", JSON.stringify(openAIData));
      throw new Error('Unexpected response format from OpenAI');
    }

    // Extract and parse the generated segments
    const rawContent = openAIData.choices[0].message.content.trim();
    console.log("Raw OpenAI content:", rawContent);
    
    // Try to extract JSON from the response if it's not already pure JSON
    let jsonStart = rawContent.indexOf('[');
    let jsonEnd = rawContent.lastIndexOf(']');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Could not find JSON array in OpenAI response');
    }
    
    const jsonContent = rawContent.substring(jsonStart, jsonEnd + 1);
    
    // Parse the JSON segments
    let segments;
    try {
      segments = JSON.parse(jsonContent);
      console.log("Parsed segments:", JSON.stringify(segments));
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("JSON content that failed to parse:", jsonContent);
      throw new Error(`Failed to parse JSON from OpenAI response: ${parseError.message}`);
    }

    // Validate segments format
    if (!Array.isArray(segments)) {
      throw new Error('Segments must be an array');
    }

    // Insert segments into the database
    console.log(`Inserting ${segments.length} segments into professor_lecture_segments table`);
    const { error: deleteError } = await supabase
      .from('professor_lecture_segments')
      .delete()
      .eq('professor_lecture_id', lectureId);

    if (deleteError) {
      console.error("Error deleting existing segments:", deleteError);
      throw new Error(`Failed to delete existing segments: ${deleteError.message}`);
    }

    for (const segment of segments) {
      // Validate segment properties
      if (!segment.sequence_number || !segment.title || !segment.segment_description) {
        console.error("Invalid segment format:", segment);
        continue; // Skip invalid segments
      }

      const { error: insertError } = await supabase
        .from('professor_lecture_segments')
        .insert({
          professor_lecture_id: lectureId,
          sequence_number: segment.sequence_number,
          title: segment.title,
          segment_description: segment.segment_description
        });

      if (insertError) {
        console.error(`Error inserting segment ${segment.sequence_number}:`, insertError);
        throw new Error(`Failed to insert segment ${segment.sequence_number}: ${insertError.message}`);
      }
    }

    console.log("All professor segments inserted successfully");

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: "Professor segments generated and stored successfully",
      segments: segments
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in generate-professor-segments-structure:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

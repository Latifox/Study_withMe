
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { OpenAI } from "https://esm.sh/openai@4.20.1";

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
    const { lectureId, lectureContent, lectureTitle, segmentCount = 5 } = await req.json();
    
    if (!lectureId || !lectureContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lectureId or lectureContent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';

    if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing environment variables' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Initialize Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    console.log(`Processing lecture ID: ${lectureId}`);

    // Truncate the lecture content if it's too long
    const maxContentLength = 28000; // Adjust this based on your token limits
    const truncatedContent = lectureContent.length > maxContentLength 
      ? lectureContent.substring(0, maxContentLength) + "... [content truncated]" 
      : lectureContent;

    // Create the prompt for generating segment structure
    const prompt = `
      You are an AI educational content creator. Your task is to analyze the following lecture and divide it into ${segmentCount} logical segments.
      For each segment, provide a short, descriptive title and a brief description of what that segment covers.
      
      The content should be organized as a progression of concepts, where each segment builds upon the previous ones.
      
      Lecture Title: ${lectureTitle}
      
      Lecture Content:
      ${truncatedContent}
      
      Generate exactly ${segmentCount} segments. For each segment, provide:
      1. A short, concise title (5-7 words max)
      2. A brief description (1-2 sentences) explaining what the segment covers
      
      Format your response as a valid JSON array with the following structure:
      [
        {
          "sequence_number": 1,
          "title": "First Segment Title",
          "segment_description": "Description of what segment 1 covers."
        },
        {
          "sequence_number": 2,
          "title": "Second Segment Title",
          "segment_description": "Description of what segment 2 covers."
        },
        ...
      ]
    `;

    console.log('Sending request to OpenAI API...');
    // Call OpenAI API - UPDATED MODEL FROM gpt-4 to gpt-4o-mini
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Extract the generated content from OpenAI response
    const responseContent = completion.choices[0]?.message?.content?.trim() || '';
    console.log('OpenAI response received, processing...');

    // Extract JSON from the response (AI might add extra text around the JSON)
    let jsonStr = responseContent;
    const jsonMatch = responseContent.match(/\[\s*\{.*\}\s*\]/s);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    // Parse the JSON response
    let segments;
    try {
      segments = JSON.parse(jsonStr);
      
      // Validate the structure
      if (!Array.isArray(segments)) {
        throw new Error("Response is not an array");
      }
      
      // Ensure we have the right number of segments
      const segmentLimit = Math.min(segments.length, segmentCount);
      segments = segments.slice(0, segmentLimit);
      
      for (let i = 0; i < segments.length; i++) {
        // Ensure sequence numbers are correct
        segments[i].sequence_number = i + 1;
        
        // Add lecture_id to each segment
        segments[i].lecture_id = lectureId;
      }
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.log('Raw response:', responseContent);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse OpenAI response', 
          details: error.message,
          raw_response: responseContent 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Insert segments into the database
    console.log(`Inserting ${segments.length} segments into the database...`);
    const { data, error } = await supabase
      .from('professor_lecture_segments')
      .insert(segments)
      .select();

    if (error) {
      console.error('Error inserting segments:', error);
      return new Response(
        JSON.stringify({ error: 'Database error', details: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Segments inserted successfully');
    return new Response(
      JSON.stringify({ success: true, segments }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.1';

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
    const { content } = await req.json();
    if (!content) {
      throw new Error('No content provided');
    }

    console.log('Content length:', content.length);
    console.log('Generating segment structure...');

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert educator skilled at creating engaging, narrative-style learning content. Your task is to analyze educational materials and break them down into logical learning segments that tell a cohesive story.

For each segment, you will write a detailed narrative description that:
1. Provides context and background information
2. Explains real-world applications and implications
3. Highlights connections between concepts
4. Describes specific examples and scenarios
5. Outlines a clear learning journey

Avoid simply listing topics or concepts. Instead, craft a narrative that explains how concepts build upon each other and connect to form a complete understanding. Each description should read like a mini-story that guides the learning process.`
          },
          {
            role: 'user',
            content: `Please analyze this content and break it down into 4-8 logical learning segments. For each segment:
            1. Create a clear, descriptive title that captures the main theme
            2. Write a detailed narrative description (3-5 sentences) that tells the story of what will be learned, including context, connections, and real-world relevance
            3. Format your response as a JSON object with this structure:
            {
              "segments": [
                {
                  "title": "Segment Title",
                  "description": "Narrative description..."
                }
              ]
            }
            
            Here is the content to analyze:
            ${content}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received OpenAI response');

    // Validate response format
    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid response format from OpenAI:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    let segments;
    try {
      const rawContent = data.choices[0].message.content;
      console.log('Raw OpenAI response:', rawContent);
      
      segments = JSON.parse(rawContent);
      console.log('Parsed segments:', JSON.stringify(segments, null, 2));
      
      // Validate segments structure
      if (!segments.segments || !Array.isArray(segments.segments)) {
        throw new Error('Invalid segments structure');
      }

      // Validate each segment
      segments.segments.forEach((segment: any, index: number) => {
        if (!segment.title || typeof segment.title !== 'string') {
          throw new Error(`Invalid title in segment ${index}`);
        }
        if (!segment.description || typeof segment.description !== 'string') {
          throw new Error(`Invalid description in segment ${index}`);
        }
      });
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.error('Raw response:', data.choices[0].message.content);
      throw new Error(`Failed to parse segments from OpenAI response: ${error.message}`);
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    const { lectureId } = await req.json();
    if (!lectureId) {
      throw new Error('No lecture ID provided');
    }

    console.log(`Saving ${segments.segments.length} segments for lecture ${lectureId}`);

    // Insert segments into the database
    const { error: insertError } = await supabaseClient
      .from('lecture_segments')
      .upsert(
        segments.segments.map((segment: any, index: number) => ({
          lecture_id: lectureId,
          sequence_number: index + 1,
          title: segment.title,
          segment_description: segment.description
        }))
      );

    if (insertError) {
      console.error('Error inserting segments:', insertError);
      throw new Error(`Failed to save segments: ${insertError.message}`);
    }

    console.log('Successfully saved segments');

    return new Response(
      JSON.stringify({ 
        message: 'Segments generated and saved successfully',
        segmentCount: segments.segments.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-segments-structure:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

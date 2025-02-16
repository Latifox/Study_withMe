
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, lectureContent } = await req.json();
    
    if (!lectureId) {
      throw new Error('Missing required parameters');
    }

    console.log('Generating segments structure for lecture:', lectureId);
    console.log('Content length:', lectureContent?.length);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert educational content organizer. Your task is to:
1. First identify the primary language of the provided lecture content
2. Then, using ONLY THAT SAME LANGUAGE:
   - Break down the content into 4-6 logical segments
   - Create descriptive titles and descriptions for each segment
3. Ensure NO CONCEPT OVERLAP between segments
4. For each segment:
   - Create a clear, descriptive title IN THE SAME LANGUAGE AS THE CONTENT
   - Write a HIGHLY SPECIFIC description (max 50 words) IN THE SAME LANGUAGE that explicitly lists WHICH concepts will be covered

CRITICAL: DO NOT MIX LANGUAGES - use ONLY the language detected in the source content.
If the content is in Spanish, write everything in Spanish.
If the content is in German, write everything in German.
etc.

Return a valid JSON array of objects with 'title' and 'description' fields.`
          },
          {
            role: 'user',
            content: lectureContent
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to generate segments: ${error}`);
    }

    const openAIResponse = await response.json();
    console.log('OpenAI response:', JSON.stringify(openAIResponse, null, 2));

    if (!openAIResponse.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    let segments;
    try {
      const parsedContent = JSON.parse(openAIResponse.choices[0].message.content);
      segments = Array.isArray(parsedContent) ? parsedContent : parsedContent.segments;
      
      if (!Array.isArray(segments)) {
        throw new Error('Response is not an array');
      }

      // Validate segment descriptions for uniqueness and specificity
      const concepts = new Set();
      segments.forEach((segment, index) => {
        const segmentConcepts = extractConcepts(segment.description);
        segmentConcepts.forEach(concept => {
          if (concepts.has(concept)) {
            throw new Error(`Concept "${concept}" appears in multiple segments`);
          }
          concepts.add(concept);
        });
      });

      console.log('Parsed segments:', JSON.stringify(segments, null, 2));
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.error('Raw content:', openAIResponse.choices[0].message.content);
      throw new Error('Failed to parse segments structure from OpenAI response');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Delete existing segments for this lecture
    const { error: deleteError } = await supabaseClient
      .from('lecture_segments')
      .delete()
      .eq('lecture_id', lectureId);

    if (deleteError) {
      console.error('Error deleting existing segments:', deleteError);
      throw deleteError;
    }

    // Prepare segments for insertion with proper mapping
    const segmentsToInsert = segments.map((segment, index) => ({
      lecture_id: lectureId,
      sequence_number: index + 1,
      title: segment.title,
      segment_description: segment.description
    }));

    console.log('Inserting segments:', JSON.stringify(segmentsToInsert, null, 2));

    // Insert new segments
    const { data: insertedSegments, error: insertError } = await supabaseClient
      .from('lecture_segments')
      .insert(segmentsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting segments:', insertError);
      throw insertError;
    }

    console.log('Successfully inserted segments:', JSON.stringify(insertedSegments, null, 2));

    return new Response(
      JSON.stringify({ segments: insertedSegments }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-segments-structure:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to extract concepts from a segment description
function extractConcepts(description: string): string[] {
  // Look for numbered lists in the description
  const concepts = description.match(/\d+\)\s*([^.;,\d)]+)/g) || [];
  return concepts.map(c => c.replace(/^\d+\)\s*/, '').trim().toLowerCase());
}

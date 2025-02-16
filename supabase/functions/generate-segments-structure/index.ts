
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SegmentStructure {
  title: string;
  description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, lectureContent } = await req.json();
    
    if (!lectureId || !lectureContent) {
      throw new Error('Missing required parameters');
    }

    console.log('Generating segments structure for lecture:', lectureId);
    console.log('Content length:', lectureContent.length);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert educational content organizer. Your task is to:
1. Analyze the provided lecture content
2. Break it down into 4-6 logical segments, ensuring NO CONCEPT OVERLAP between segments
3. For each segment:
   - Create a clear, descriptive title
   - Write a HIGHLY SPECIFIC description (max 50 words) that explicitly lists WHICH concepts will be covered
   
CRITICAL GUIDELINES:
- Each concept must appear in EXACTLY ONE segment
- Ensure zero concept overlap between segments
- Each description must explicitly list the concepts to be covered
- Maintain a clear progression of topics
- Make descriptions extremely specific about what concepts will be covered
- NO emojis or special characters
- Return a valid JSON array

Example of good descriptions:
"Covers: 1) Definition of inertia 2) Objects at rest 3) Newton's First Law formula F=ma. Does NOT include motion or energy concepts."

"Focuses on: 1) Gravitational potential energy 2) Energy conservation in gravity 3) Gravitational field equations. Excludes other energy types."

Your response must be a valid JSON array of objects with 'title' and 'description' fields.`
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

    let segments: SegmentStructure[];
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

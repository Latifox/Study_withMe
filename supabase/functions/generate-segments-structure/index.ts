
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert educational content organizer. Your task is to:
1. Analyze the provided lecture content
2. Break it down into 4-6 logical segments
3. For each segment:
   - Create a clear, descriptive title
   - Write a concise description (max 50 words) of the main concepts
   
IMPORTANT GUIDELINES:
- Ensure concepts don't overlap between segments
- Each segment should cover distinct topics
- Each description should clearly outline what concepts will be covered
- Maintain a logical progression of topics
- Keep descriptions focused and specific
- NO emojis or special characters
            
Format your response as a JSON array of objects with 'title' and 'description' fields.
Example:
[
  {
    "title": "Introduction to Newton's Laws",
    "description": "Fundamental principles of Newton's First Law of Motion, covering inertia, rest, and uniform motion. Includes basic force concepts and real-world applications."
  }
]`
          },
          {
            role: 'user',
            content: lectureContent
          }
        ],
        temperature: 0.5
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to generate segments: ${error}`);
    }

    const openAIResponse = await response.json();
    console.log('OpenAI response:', openAIResponse);

    if (!openAIResponse.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    let segments: SegmentStructure[];
    try {
      segments = JSON.parse(openAIResponse.choices[0].message.content);
      console.log('Parsed segments:', segments);
      
      if (!Array.isArray(segments)) {
        throw new Error('Response is not an array');
      }
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
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
      segment_description: segment.description // This was missing proper mapping
    }));

    console.log('Inserting segments:', segmentsToInsert);

    // Insert new segments
    const { data: insertedSegments, error: insertError } = await supabaseClient
      .from('lecture_segments')
      .insert(segmentsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting segments:', insertError);
      throw insertError;
    }

    console.log('Successfully inserted segments:', insertedSegments);

    return new Response(
      JSON.stringify({ segments: insertedSegments }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-segments-structure:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

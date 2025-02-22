
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    console.log('Received request for lecture:', lectureId);

    if (!lectureContent) {
      throw new Error('No lecture content provided');
    }

    console.log('Content length:', lectureContent.length);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('Missing OpenAI API key');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing educational content and breaking it down into logical segments. 
            For each segment, you will write a detailed description of 3-5 sentences that explains exactly what content should be covered.
            These descriptions will be used to generate theory slides, so be specific about what aspects and details should be included.
            Focus on explaining the relationships between concepts and what specific points need to be addressed.
            Do not just list topics - explain how they should be presented and what specific points need to be addressed.
            Important: Make sure each segment covers unique concepts - do not repeat the same concepts across multiple segments.`
          },
          {
            role: 'user',
            content: `Analyze this lecture content and break it into 5-8 logical segments. For each segment:
            1. Create a clear, focused title that reflects the main concept being covered
            2. Write a detailed description of 3-5 sentences explaining what specific content should be covered in that segment
            
            The descriptions should:
            - Be specific about what aspects to cover
            - Explain how concepts relate to each other
            - Not repeat concepts that are covered in other segments
            - Include examples or applications where relevant
            
            Each segment should build on previous ones in a logical progression. Return the segments in this exact JSON format:
            {
              "segments": [
                {
                  "title": "segment title",
                  "segment_description": "detailed 3-5 sentence description"
                }
              ]
            }

            Here's the lecture content to analyze:
            ${lectureContent}`
          }
        ],
        temperature: 0.7,  // Balanced between creativity and consistency
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate segments: ' + error);
    }

    const data = await response.json();
    console.log('Received response from OpenAI');

    const segments = JSON.parse(data.choices[0].message.content);

    // Create Supabase client
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

    // Insert new segments with sequence numbers
    const formattedSegments = segments.segments.map((segment: any, index: number) => ({
      lecture_id: lectureId,
      sequence_number: index + 1,
      title: segment.title,
      segment_description: segment.segment_description
    }));

    const { error: insertError } = await supabaseClient
      .from('lecture_segments')
      .insert(formattedSegments);

    if (insertError) {
      console.error('Error inserting segments:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        message: 'Segments created successfully', 
        segments: formattedSegments 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

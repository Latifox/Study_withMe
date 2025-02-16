
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
    
    if (!lectureId || !lectureContent) {
      throw new Error('Missing required parameters: lectureId or lectureContent');
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
            content: `You are an expert educational content organizer. Your task is to break down educational content into logical segments.

CRITICAL: You MUST return a JSON object with EXACTLY this structure:
{
  "segments": [
    {
      "title": "string",
      "description": "string"
    }
  ]
}

Requirements:
1. Generate 4-6 segments
2. Use the SAME LANGUAGE as the input content
3. Each segment must cover distinct concepts (no overlap)
4. For each segment provide:
   - A clear, descriptive title (in the content's language)
   - A specific description (in the content's language, max 50 words)
   
Remember: ONLY return the JSON object, no other text or explanation.`
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
      // First try to parse the response
      const rawContent = openAIResponse.choices[0].message.content;
      console.log('Raw OpenAI content:', rawContent);
      
      const parsedContent = JSON.parse(rawContent);
      console.log('Parsed content:', JSON.stringify(parsedContent, null, 2));

      // Check if we have a segments array
      if (!parsedContent.segments || !Array.isArray(parsedContent.segments)) {
        throw new Error('Response missing segments array');
      }

      // Validate each segment
      parsedContent.segments.forEach((segment, index) => {
        if (!segment.title || typeof segment.title !== 'string') {
          throw new Error(`Segment ${index + 1} missing valid title`);
        }
        if (!segment.description || typeof segment.description !== 'string') {
          throw new Error(`Segment ${index + 1} missing valid description`);
        }
      });

      segments = parsedContent.segments;
      console.log('Valid segments found:', segments.length);

    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.error('Raw content:', openAIResponse.choices[0].message.content);
      
      // Try to recover if possible
      const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `Fix this JSON to match the required format exactly:
{
  "segments": [
    {
      "title": "string",
      "description": "string"
    }
  ]
}
Do not add any additional fields or text.`
            },
            {
              role: 'user',
              content: openAIResponse.choices[0].message.content
            }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        }),
      });

      if (!retryResponse.ok) {
        throw new Error('Failed to recover malformed JSON');
      }

      const retryData = await retryResponse.json();
      const retryContent = JSON.parse(retryData.choices[0].message.content);
      
      if (!retryContent.segments || !Array.isArray(retryContent.segments)) {
        throw new Error('Recovery attempt failed to produce valid segments');
      }

      segments = retryContent.segments;
      console.log('Recovered segments through retry');
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
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

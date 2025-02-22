
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

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Generating segments structure for lecture:', lectureId);
    console.log('Content length:', lectureContent.length);

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
            content: `Break down the lecture content into 4-5 logical segments. For each segment:
1. Create a clear title (max 10 words)
2. Write a brief description (max 2 sentences)

Return ONLY a JSON object:
{
  "segments": [
    {
      "title": "string",
      "description": "string"
    }
  ]
}`
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
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API call failed: ${response.status} ${response.statusText}`);
    }

    const openAIResponse = await response.json();
    if (!openAIResponse.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response structure:', openAIResponse);
      throw new Error('Invalid response structure from OpenAI');
    }

    let segments;
    try {
      const rawContent = openAIResponse.choices[0].message.content;
      console.log('Raw OpenAI content:', rawContent);
      
      const parsedContent = JSON.parse(rawContent);
      console.log('Parsed content:', JSON.stringify(parsedContent, null, 2));

      if (!parsedContent.segments || !Array.isArray(parsedContent.segments)) {
        throw new Error('Response missing segments array');
      }

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
      throw new Error(`Failed to parse OpenAI response: ${error.message}`);
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
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

    console.log('Successfully inserted segments:', insertedSegments);

    return new Response(
      JSON.stringify({ segments: insertedSegments }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in generate-segments-structure:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

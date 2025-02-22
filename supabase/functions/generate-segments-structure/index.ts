
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

    console.log('Processing request for lecture:', lectureId);
    console.log('Content length:', lectureContent.length);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Get language settings
    const { data: aiConfig } = await supabaseClient
      .from('lecture_ai_configs')
      .select('content_language')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    const { data: lecture } = await supabaseClient
      .from('lectures')
      .select('original_language')
      .eq('id', lectureId)
      .single();

    const targetLanguage = aiConfig?.content_language || lecture?.original_language || 'English';
    console.log('Using target language:', targetLanguage);

    console.log('Making OpenAI API request...');
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
            content: `You are an expert at breaking down educational content into clear, organized segments. Generate 5-7 segments for this lecture, ensuring each segment follows this specific format:

1. Title: Maximum 5 words, clear and descriptive
2. Description: Must start with "Key concepts:" followed by 2-4 key concepts
   Format: "Key concepts: concept1 (aspect1, aspect2), concept2 (aspect1, aspect2)"

Rules:
- Each concept must have exactly 2 aspects in parentheses
- Use simple, clear nouns or short phrases for aspects
- Aspects should be categories or topics, not definitions
- Examples of good aspects: (properties, applications), (types, calculations), (methods, examples)
- Concepts must be unique across all segments
- Always write in ${targetLanguage}

Respond only with a JSON object containing an array of segments.`
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
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const openAIResponse = await response.json();
    console.log('Received OpenAI response');

    if (!openAIResponse.choices?.[0]?.message?.content) {
      throw new Error('Invalid response structure from OpenAI');
    }

    let segments;
    try {
      const parsedContent = JSON.parse(openAIResponse.choices[0].message.content);
      
      if (!parsedContent.segments || !Array.isArray(parsedContent.segments)) {
        throw new Error('Response missing segments array');
      }

      if (parsedContent.segments.length < 5) {
        throw new Error('Not enough segments generated (minimum 5 required)');
      }

      segments = parsedContent.segments;
      console.log('Parsed segments:', segments);

      // Delete existing segments
      const { error: deleteError } = await supabaseClient
        .from('lecture_segments')
        .delete()
        .eq('lecture_id', lectureId);

      if (deleteError) throw deleteError;

      // Insert new segments
      const segmentsToInsert = segments.map((segment: any, index: number) => ({
        lecture_id: lectureId,
        sequence_number: index + 1,
        title: segment.title,
        segment_description: segment.description
      }));

      const { data: insertedSegments, error: insertError } = await supabaseClient
        .from('lecture_segments')
        .insert(segmentsToInsert)
        .select();

      if (insertError) throw insertError;

      console.log('Successfully inserted segments');
      return new Response(JSON.stringify({ segments: insertedSegments }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error processing OpenAI response:', error);
      throw error;
    }

  } catch (error) {
    console.error('Function error:', error);
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

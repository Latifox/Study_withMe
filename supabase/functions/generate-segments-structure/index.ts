
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

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `As an educational content analyzer, break down this lecture into 5-7 key topics. For each topic:
1. Give a clear, descriptive title (max 5 words)
2. List 2-3 core concepts that must be taught
3. For each concept, specify 2 general aspects to explore (like "structure", "function", "types", "applications")

Focus on core material and logical progression.`
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

    if (!analysisResponse.ok) {
      throw new Error(`OpenAI API error: ${analysisResponse.status} ${analysisResponse.statusText}`);
    }

    const analysisData = await analysisResponse.json();
    const topics = JSON.parse(analysisData.choices[0].message.content);

    // Now generate the final segments based on the analysis
    const segmentsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `Create ${topics.topics.length} educational segments based on the provided topics. For each segment:

Title: Max 5 words, clear and descriptive
Description: Start with "Key concepts:" and list 2-3 concepts with their aspects in this format:
"Key concepts: concept1 (aspect1, aspect2), concept2 (aspect1, aspect2)"

Rules:
- Write in ${targetLanguage}
- Each concept must have exactly 2 aspects
- Use general aspect categories like: properties, types, methods, applications, structure, function
- NO examples or specific details in aspects
- Keep concepts unique across segments

The description should ONLY list concepts and aspects, nothing else.`
          },
          {
            role: 'user',
            content: JSON.stringify(topics)
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!segmentsResponse.ok) {
      throw new Error(`OpenAI API error: ${segmentsResponse.status} ${segmentsResponse.statusText}`);
    }

    const segmentsData = await segmentsResponse.json();
    const segments = JSON.parse(segmentsData.choices[0].message.content);

    if (!segments || !segments.segments || !Array.isArray(segments.segments)) {
      throw new Error('Invalid segments structure returned from OpenAI');
    }

    // Delete existing segments
    const { error: deleteError } = await supabaseClient
      .from('lecture_segments')
      .delete()
      .eq('lecture_id', lectureId);

    if (deleteError) throw deleteError;

    // Insert new segments
    const segmentsToInsert = segments.segments.map((segment: any, index: number) => ({
      lecture_id: lectureId,
      sequence_number: index + 1,
      title: segment.title,
      segment_description: segment.description
    }));

    const { error: insertError } = await supabaseClient
      .from('lecture_segments')
      .insert(segmentsToInsert);

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ 
      success: true,
      segmentCount: segmentsToInsert.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

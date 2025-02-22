
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

    // First analyze the content to identify main topics
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
            content: `You are an expert at analyzing educational content and identifying key topics. Analyze this lecture content and identify the 5-7 most important main topics that need to be covered, ensuring comprehensive coverage of the material. Return a JSON object with an array of topics, each containing:
1. topic_title: A clear, descriptive title (max 5 words)
2. key_concepts: Array of 2-3 most important concepts within this topic
3. suggested_aspects: For each concept, 2 aspects to explore (like types, properties, applications, etc.)

Focus on capturing the breadth of the lecture while maintaining logical progression.`
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
            content: `You are an expert at organizing educational content into clear, focused segments. Based on the provided topic analysis, create ${topics.topics.length} segments that will effectively teach this material. For each segment:

1. Title: Maximum 5 words, matching the analyzed topic titles
2. Description: Must start with "Key concepts:" followed by 2-3 key concepts in this EXACT format:
   "Key concepts: concept1 (aspect1, aspect2), concept2 (aspect1, aspect2)"

CRUCIAL RULES:
- DO NOT include any actual content or examples in the aspects
- Aspects should be general categories/dimensions to explore, NOT specific examples or values
- CORRECT example: "coal (types, properties)" - just naming the aspects to explore
- INCORRECT example: "coal (bituminous, lignite)" - DO NOT list specific types!
- INCORRECT example: "coal (high carbon content, black color)" - DO NOT describe properties!
- Each concept must have exactly 2 aspects
- Use simple, clear nouns for aspects like: properties, types, methods, applications, structure, function, etc.
- Concepts must be unique across all segments
- Always write in ${targetLanguage}

Use the analyzed topics and their key concepts as a basis for your segments.
Respond only with a JSON object containing an array of segments with title and description fields.`
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

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

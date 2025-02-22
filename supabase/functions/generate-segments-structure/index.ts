
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting generate-segments-structure function');

    if (!openAiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    // Parse request body
    const { lectureId, lectureContent } = await req.json();

    if (!lectureId || !lectureContent) {
      console.error('Missing required parameters:', { lectureId, hasContent: !!lectureContent });
      throw new Error('Missing required parameters: lectureId or lectureContent');
    }

    // Get lecture title for context
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('title')
      .eq('id', lectureId)
      .single();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture details');
    }

    console.log('Processing lecture:', lecture.title);
    console.log('Content length:', lectureContent.length);

    // Extract a summary of key topics from the content
    const topicsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: "system",
            content: "You are a subject matter expert. Extract 4-6 main topics from the lecture content. Be specific and use actual terms and concepts from the text."
          },
          {
            role: "user",
            content: `Extract 4-6 main topics from this lecture titled "${lecture.title}". Be specific and accurate to the content:\n\n${lectureContent.substring(0, 15000)}`
          }
        ],
      }),
    });

    const topicsResult = await topicsResponse.json();
    const mainTopics = topicsResult.choices[0].message.content;

    console.log('Calling OpenAI API for segment structure...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: "system",
            content: `You are an expert educational content designer specializing in ${lecture.title}. Your task is to create a structured learning pathway that builds up the learner's understanding progressively.`
          },
          {
            role: "user",
            content: `Create 4-6 learning segments for a lecture titled "${lecture.title}". Use these main topics as a guide:\n${mainTopics}\n\nFor each segment:
1. Title should be specific and reflect actual concepts from the lecture
2. Description should explain what concepts will be learned and why they matter
3. Sequence should build knowledge progressively

Return ONLY a JSON object with this structure (no markdown):
{
  "segments": [
    {
      "title": "Specific, concept-focused title",
      "sequence_number": 1,
      "segment_description": "Clear description of what will be learned"
    }
  ]
}

Base your response on these topics and this lecture content:
${lectureContent.substring(0, 15000)}`
          }
        ],
        temperature: 0.3, // Lower temperature for more focused output
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      throw new Error('OpenAI API request failed');
    }

    const result = await response.json();
    if (!result.choices?.[0]?.message?.content) {
      console.error('Unexpected OpenAI response format:', result);
      throw new Error('Invalid response format from OpenAI');
    }

    console.log('Received OpenAI response, parsing JSON...');
    const content = result.choices[0].message.content;
    
    let segments;
    try {
      segments = JSON.parse(content.trim());
      if (!segments.segments || !Array.isArray(segments.segments)) {
        console.error('Invalid segments structure:', segments);
        throw new Error('Invalid segments structure');
      }
    } catch (error) {
      console.error('Error parsing OpenAI response:', error, '\nContent:', content);
      throw new Error('Failed to parse segments structure from OpenAI response');
    }

    console.log('Successfully parsed segments:', segments);

    // Delete existing segments first
    await supabase
      .from('lecture_segments')
      .delete()
      .eq('lecture_id', lectureId);

    // Insert new segments
    for (const segment of segments.segments) {
      console.log('Inserting segment:', segment);
      const { error: insertError } = await supabase
        .from('lecture_segments')
        .insert({
          lecture_id: lectureId,
          sequence_number: segment.sequence_number,
          title: segment.title,
          segment_description: segment.segment_description
        });

      if (insertError) {
        console.error('Error inserting segment:', insertError);
        throw new Error('Failed to insert segment into database');
      }
    }

    return new Response(
      JSON.stringify({ success: true, segments: segments.segments }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-segments-structure:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

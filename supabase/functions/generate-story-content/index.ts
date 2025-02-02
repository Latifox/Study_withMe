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
    const { lectureId } = await req.json();
    console.log('Generating story segments for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .single();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    if (!lecture?.content) {
      throw new Error('No lecture content found');
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are a curriculum organizer. Your task is to break down lecture content into 10 logical segments. Output ONLY valid JSON in this format:
{
  "segments": [
    {
      "id": "segment-1",
      "title": "Segment Title",
      "description": "Brief description of segment content"
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Break down this lecture titled "${lecture.title}" into 10 logical segments: ${lecture.content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResponseData = await openAIResponse.json();
    const segmentData = JSON.parse(aiResponseData.choices[0].message.content);

    // Create story content entry
    const { data: storyContent, error: insertError } = await supabaseClient
      .from('story_contents')
      .insert({
        lecture_id: lectureId,
        content: segmentData,
        total_segments: segmentData.segments.length,
        current_segment: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting story content:', insertError);
      throw insertError;
    }

    // Create segment entries
    const segmentInserts = segmentData.segments.map((segment: any, index: number) => ({
      story_content_id: storyContent.id,
      segment_number: index,
      segment_title: segment.title,
      is_generated: false
    }));

    const { error: segmentError } = await supabaseClient
      .from('story_segment_contents')
      .insert(segmentInserts);

    if (segmentError) {
      console.error('Error inserting segments:', segmentError);
      throw segmentError;
    }

    return new Response(
      JSON.stringify({ storyContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-story-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
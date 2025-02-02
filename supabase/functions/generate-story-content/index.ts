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

    // Generate initial segments structure
    const segments = Array.from({ length: 5 }, (_, i) => ({
      id: `segment-${i + 1}`,
      title: `Part ${i + 1}`,
      description: `Description for part ${i + 1}`,
      content: {
        slides: [
          {
            id: `slide-${i}-1`,
            content: "Sample content for slide 1"
          },
          {
            id: `slide-${i}-2`,
            content: "Sample content for slide 2"
          }
        ],
        questions: [
          {
            id: `question-${i}-1`,
            type: "true_false",
            question: "Sample true/false question",
            correctAnswer: true,
            explanation: "Sample explanation"
          },
          {
            id: `question-${i}-2`,
            type: "multiple_choice",
            question: "Sample multiple choice question",
            options: ["Option A", "Option B", "Option C"],
            correctAnswer: "Option A",
            explanation: "Sample explanation"
          }
        ]
      }
    }));

    // Create story content entry
    const { data: storyContent, error: insertError } = await supabaseClient
      .from('story_contents')
      .insert({
        lecture_id: lectureId,
        content: { segments },
        total_segments: segments.length,
        current_segment: 0,
        is_generated: true,
        generation_status: 'completed'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting story content:', insertError);
      throw insertError;
    }

    // Create segment entries
    const segmentInserts = segments.map((segment, index) => ({
      story_content_id: storyContent.id,
      segment_number: index,
      segment_title: segment.title,
      content: segment.content,
      is_generated: true
    }));

    const { error: segmentError } = await supabaseClient
      .from('story_segment_contents')
      .insert(segmentInserts);

    if (segmentError) {
      console.error('Error inserting segments:', segmentError);
      throw segmentError;
    }

    return new Response(
      JSON.stringify({ storyContent: { segments } }),
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
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

    // Create story content entry first
    const { data: storyContent, error: storyError } = await supabaseClient
      .from('story_contents')
      .insert({
        lecture_id: lectureId,
        title: lecture.title,
        total_segments: 3,
        current_segment: 0,
        is_generated: true,
        generation_status: 'completed'
      })
      .select()
      .single();

    if (storyError) {
      console.error('Error creating story content:', storyError);
      throw storyError;
    }

    // Generate segments with proper content structure
    const segmentInserts = Array.from({ length: 3 }, (_, i) => ({
      story_content_id: storyContent.id,
      segment_number: i,
      title: `Part ${i + 1}`,
      content: {
        description: `Description for part ${i + 1}`,
        slides: [
          {
            id: `slide-${i}-1`,
            content: "# Introduction\n\nThis is the first slide of the segment."
          },
          {
            id: `slide-${i}-2`,
            content: "# Key Points\n\n- Point 1\n- Point 2\n- Point 3"
          }
        ],
        questions: [
          {
            id: `question-${i}-1`,
            type: "true_false",
            question: "Is this a sample question?",
            correctAnswer: true,
            explanation: "This is a sample explanation for the true/false question."
          },
          {
            id: `question-${i}-2`,
            type: "multiple_choice",
            question: "Which option is correct?",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: "Option A",
            explanation: "This is a sample explanation for the multiple choice question."
          }
        ]
      },
      is_generated: true
    }));

    const { error: segmentError } = await supabaseClient
      .from('story_segment_contents')
      .insert(segmentInserts);

    if (segmentError) {
      console.error('Error inserting segments:', segmentError);
      throw segmentError;
    }

    // Return the processed content
    const segments = segmentInserts.map(segment => ({
      id: `segment-${segment.segment_number + 1}`,
      title: segment.title,
      description: segment.content.description,
      slides: segment.content.slides,
      questions: segment.content.questions
    }));

    return new Response(
      JSON.stringify({ 
        storyContent: { segments }
      }),
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
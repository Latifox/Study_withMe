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
    console.log('Starting story generation for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .single();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error(`Failed to fetch lecture content: ${lectureError.message}`);
    }

    if (!lecture || !lecture.content) {
      console.error('No lecture content found for ID:', lectureId);
      throw new Error('Lecture content is empty or not found');
    }

    // Generate default segment titles based on lecture content length
    const content = lecture.content;
    const segmentTitles = [
      "Introduction and Overview",
      "Key Concepts Part 1",
      "Key Concepts Part 2",
      "Detailed Analysis Part 1",
      "Detailed Analysis Part 2",
      "Practical Applications Part 1",
      "Practical Applications Part 2",
      "Advanced Topics",
      "Case Studies",
      "Summary and Conclusion"
    ];

    console.log('Creating story content entry with default segments...');
    
    // Create new story content entry
    const { data: storyContent, error: storyError } = await supabaseClient
      .from('story_contents')
      .insert({
        lecture_id: lectureId,
        segment_1_title: segmentTitles[0],
        segment_2_title: segmentTitles[1],
        segment_3_title: segmentTitles[2],
        segment_4_title: segmentTitles[3],
        segment_5_title: segmentTitles[4],
        segment_6_title: segmentTitles[5],
        segment_7_title: segmentTitles[6],
        segment_8_title: segmentTitles[7],
        segment_9_title: segmentTitles[8],
        segment_10_title: segmentTitles[9]
      })
      .select()
      .single();

    if (storyError) {
      console.error('Error creating story content:', storyError);
      throw storyError;
    }

    // Split content into roughly equal segments
    const contentWords = content.split(' ');
    const wordsPerSegment = Math.ceil(contentWords.length / 10);
    
    // Create segment contents
    for (let i = 0; i < 10; i++) {
      const start = i * wordsPerSegment;
      const end = Math.min((i + 1) * wordsPerSegment, contentWords.length);
      const segmentContent = contentWords.slice(start, end).join(' ');

      const { error: segmentError } = await supabaseClient
        .from('story_segment_contents')
        .insert({
          story_content_id: storyContent.id,
          segment_number: i,
          content: {
            slides: [
              {
                id: `slide-1-segment-${i}`,
                content: segmentContent
              },
              {
                id: `slide-2-segment-${i}`,
                content: "Review and practice what you've learned in this segment."
              }
            ],
            questions: [
              {
                id: `question-1-segment-${i}`,
                type: "true_false",
                question: "Did you understand the content of this segment?",
                correctAnswer: true,
                explanation: "This is a self-assessment question to help you track your understanding."
              },
              {
                id: `question-2-segment-${i}`,
                type: "multiple_choice",
                question: "How well did you grasp the concepts in this segment?",
                options: ["Very well", "Somewhat well", "Need more review", "Not sure"],
                correctAnswer: "Very well",
                explanation: "This helps you assess your confidence with the material."
              }
            ]
          },
          is_generated: true
        });

      if (segmentError) {
        console.error(`Error creating segment ${i}:`, segmentError);
        throw segmentError;
      }
    }

    console.log('Successfully generated and stored all segments');
    return new Response(
      JSON.stringify({ success: true, storyContent }),
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
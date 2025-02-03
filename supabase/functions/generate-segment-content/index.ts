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
    const { lectureId, segmentNumber, segmentTitle, lectureContent } = await req.json();
    console.log(`Generating content for segment ${segmentNumber}: ${segmentTitle}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // For now, let's generate simple content without OpenAI
    const content = {
      slides: [
        {
          id: "slide-1",
          content: `# Part 1: Introduction to ${segmentTitle}\n\nThis is the first part of the theory about ${segmentTitle}. The content is derived from the lecture material and structured for easy understanding.\n\n${lectureContent.slice(0, 200)}...`
        },
        {
          id: "slide-2",
          content: `# Part 2: Deep Dive into ${segmentTitle}\n\nThis is the second part of the theory about ${segmentTitle}. Here we explore more advanced concepts and their applications.\n\n${lectureContent.slice(200, 400)}...`
        }
      ],
      questions: [
        {
          id: "question-1",
          type: "multiple_choice",
          question: `What is the main concept discussed in ${segmentTitle}?`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: "Option A",
          explanation: "This is the explanation for the correct answer."
        },
        {
          id: "question-2",
          type: "true_false",
          question: `True or False: ${segmentTitle} is an important concept in this lecture.`,
          correctAnswer: true,
          explanation: "This concept is indeed crucial for understanding the topic."
        }
      ]
    };

    // Get the story content id
    const { data: storyContent, error: storyError } = await supabaseClient
      .from('story_contents')
      .select('id')
      .eq('lecture_id', lectureId)
      .single();

    if (storyError) {
      throw new Error('Failed to fetch story content');
    }

    // Store the generated segment content
    const { data: segmentContent, error: segmentError } = await supabaseClient
      .from('story_segment_contents')
      .insert({
        story_content_id: storyContent.id,
        segment_number: segmentNumber,
        content,
        is_generated: true
      })
      .select()
      .single();

    if (segmentError) {
      throw new Error('Failed to store segment content');
    }

    return new Response(JSON.stringify({ content: segmentContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-segment-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
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

    // Split lecture content into 10 segments and get the relevant part
    const contentParts = lectureContent.split(/[.!?]+\s+/);
    const segmentSize = Math.ceil(contentParts.length / 10);
    const startIndex = segmentNumber * segmentSize;
    const segmentContent = contentParts.slice(startIndex, startIndex + segmentSize).join('. ');

    // Generate two slides with 3 paragraphs each
    const slide1Content = `# ${segmentTitle} - Part 1\n\n${segmentContent.slice(0, Math.floor(segmentContent.length / 2))}`;
    const slide2Content = `# ${segmentTitle} - Part 2\n\n${segmentContent.slice(Math.floor(segmentContent.length / 2))}`;

    // Generate two quiz questions based on the content
    const quiz1 = {
      type: "multiple_choice" as const,
      question: `What is the main concept discussed in ${segmentTitle}?`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: "Option A",
      explanation: "This is the explanation for the correct answer based on the content."
    };

    const quiz2 = {
      type: "true_false" as const,
      question: `True or False: The content discusses important aspects of ${segmentTitle}?`,
      correctAnswer: true,
      explanation: "Based on the segment content, this statement is true."
    };

    const content = {
      slides: [
        {
          id: `slide-1-segment-${segmentNumber}`,
          content: slide1Content
        },
        {
          id: `slide-2-segment-${segmentNumber}`,
          content: slide2Content
        }
      ],
      questions: [quiz1, quiz2]
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
      .upsert({
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
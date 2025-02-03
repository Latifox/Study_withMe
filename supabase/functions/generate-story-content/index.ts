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

    // Generate segment titles using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Analyze the lecture content and generate 10 meaningful segment titles that:
            1. Follow a logical progression
            2. Use specific, descriptive names based on the actual content
            3. Help learners understand what they'll learn in each segment
            
            Return ONLY a JSON array of 10 titles, no other text.`
          },
          {
            role: 'user',
            content: lecture.content
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const openAIResponse = await response.json();
    const segmentTitles = JSON.parse(openAIResponse.choices[0].message.content);

    console.log('Generated segment titles:', segmentTitles);
    
    // Create new story content entry
    const { data: storyContent, error: storyError } = await supabaseClient
      .from('story_contents')
      .insert({
        lecture_id: lectureId
      })
      .select()
      .single();

    if (storyError) {
      console.error('Error creating story content:', storyError);
      throw storyError;
    }

    // Split content into roughly equal segments
    const contentWords = lecture.content.split(' ');
    const wordsPerSegment = Math.ceil(contentWords.length / 10);
    
    // Create segments
    for (let i = 0; i < 10; i++) {
      const start = i * wordsPerSegment;
      const end = Math.min((i + 1) * wordsPerSegment, contentWords.length);
      const segmentContent = contentWords.slice(start, end).join(' ');

      const { error: segmentError } = await supabaseClient
        .from('story_segments')
        .insert({
          story_content_id: storyContent.id,
          segment_number: i,
          title: segmentTitles[i],
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
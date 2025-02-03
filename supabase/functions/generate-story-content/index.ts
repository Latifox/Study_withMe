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

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .maybeSingle();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    if (!lecture?.content) {
      throw new Error('No lecture content found');
    }

    // Generate segments using OpenAI
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
            content: `You are an educational content generator. Your task is to create 10 learning segments from lecture content.
            Each segment must follow this exact structure:
            {
              "title": "Clear, concise segment title",
              "description": "Brief overview of what will be covered",
              "slides": [
                {
                  "id": "slide-{segment-number}-1",
                  "content": "Detailed markdown content explaining the first part of this concept"
                },
                {
                  "id": "slide-{segment-number}-2",
                  "content": "Detailed markdown content explaining the second part of this concept"
                }
              ],
              "questions": [
                {
                  "id": "question-{segment-number}-1",
                  "type": "multiple_choice",
                  "question": "Specific question about the concept",
                  "options": ["option1", "option2", "option3", "option4"],
                  "correctAnswer": "correct option",
                  "explanation": "Detailed explanation of why this is correct"
                },
                {
                  "id": "question-{segment-number}-2",
                  "type": "true_false",
                  "question": "True/false question about the concept",
                  "correctAnswer": true or false,
                  "explanation": "Detailed explanation of why this is true or false"
                }
              ]
            }

            Important guidelines:
            1. Each slide's content must be detailed and use proper markdown formatting
            2. Content must be directly derived from the lecture material
            3. Questions must test understanding of the specific segment's content
            4. Ensure progressive difficulty across segments
            5. Make content engaging and educational
            6. Use examples and analogies where appropriate
            7. Include code snippets or technical details if present in the lecture
            8. Maintain consistent formatting across all segments`
          },
          {
            role: 'user',
            content: `Generate 10 educational segments based on this lecture content: ${lecture.content}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const aiResponseData = await openAIResponse.json();
    console.log('Generated content:', aiResponseData.choices[0].message.content);
    
    const generatedContent = JSON.parse(aiResponseData.choices[0].message.content);

    // Create story content entry
    const { data: storyContent, error: storyError } = await supabaseClient
      .from('story_contents')
      .insert({
        lecture_id: lectureId,
        title: lecture.title,
        total_segments: 10,
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
    const segments = generatedContent.map((segment: any, index: number) => ({
      story_content_id: storyContent.id,
      segment_number: index,
      title: segment.title,
      content: {
        description: segment.description,
        slides: segment.slides.map((slide: any, slideIndex: number) => ({
          id: `slide-${index}-${slideIndex}`,
          content: slide.content
        })),
        questions: segment.questions.map((question: any, questionIndex: number) => ({
          id: `question-${index}-${questionIndex}`,
          type: question.type,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation
        }))
      },
      is_generated: true
    }));

    const { error: segmentError } = await supabaseClient
      .from('story_segment_contents')
      .insert(segments);

    if (segmentError) {
      console.error('Error inserting segments:', segmentError);
      throw segmentError;
    }

    // Return the processed content
    const processedSegments = segments.map(segment => ({
      id: `segment-${segment.segment_number + 1}`,
      title: segment.title,
      description: segment.content.description,
      slides: segment.content.slides,
      questions: segment.content.questions
    }));

    return new Response(
      JSON.stringify({ 
        storyContent: { segments: processedSegments }
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
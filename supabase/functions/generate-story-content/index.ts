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
      .maybeSingle();

    if (lectureError || !lecture) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    console.log('Generating content with OpenAI...');
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
            content: `You are a story content generator. Generate exactly 10 educational segments based on the provided lecture content. Each segment must have:
- A clear title
- A brief description
- 2 theory slides with markdown content
- 2 quiz questions (1 multiple choice, 1 true/false)

Follow this exact JSON structure:
{
  "segments": [
    {
      "title": "string",
      "description": "string",
      "slides": [
        {
          "id": "slide-1",
          "content": "markdown content"
        },
        {
          "id": "slide-2",
          "content": "markdown content"
        }
      ],
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        },
        {
          "id": "q2",
          "type": "true_false",
          "question": "string",
          "correctAnswer": boolean,
          "explanation": "string"
        }
      ]
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Generate 10 educational segments based on this lecture content: ${lecture.content}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const aiResponseData = await openAIResponse.json();
    const generatedContent = JSON.parse(aiResponseData.choices[0].message.content);

    console.log('Validating generated content...');
    if (!generatedContent.segments || !Array.isArray(generatedContent.segments) || generatedContent.segments.length !== 10) {
      throw new Error('Invalid content structure or wrong number of segments');
    }

    console.log('Creating story content entry...');
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

    console.log('Creating segment contents...');
    const segments = generatedContent.segments.map((segment: any, index: number) => ({
      story_content_id: storyContent.id,
      segment_number: index,
      title: segment.title,
      content: {
        description: segment.description,
        slides: segment.slides,
        questions: segment.questions
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

    console.log('Successfully generated and stored all content');
    return new Response(
      JSON.stringify({ 
        success: true,
        storyContent: { 
          segments: segments.map(segment => ({
            id: `segment-${segment.segment_number + 1}`,
            title: segment.title,
            description: segment.content.description,
            slides: segment.content.slides,
            questions: segment.content.questions
          }))
        }
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
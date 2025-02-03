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
    console.log('Generating story content for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture?.content) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    // Generate segments using OpenAI
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
            content: `You are a story content generator. Generate exactly 10 segments for this lecture content.
            Each segment should have:
            - A clear, descriptive title
            - 2 theory slides with bullet points and examples
            - 2 quiz questions (mix of multiple choice and true/false)
            
            Format the response as a clean JSON array with 10 segments, each containing:
            {
              "id": "segment-[number]",
              "title": "Clear segment title",
              "description": "Brief segment description",
              "slides": [
                {
                  "id": "slide-1",
                  "content": "Structured content with bullet points"
                },
                {
                  "id": "slide-2",
                  "content": "More structured content"
                }
              ],
              "questions": [
                {
                  "id": "q1",
                  "type": "multiple_choice",
                  "question": "Question text",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "correctAnswer": "Correct option",
                  "explanation": "Why this is correct"
                },
                {
                  "id": "q2",
                  "type": "true_false",
                  "question": "True/false question",
                  "correctAnswer": true,
                  "explanation": "Explanation why"
                }
              ]
            }`
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
      console.error('OpenAI API error:', response.status);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw OpenAI response:', data);

    let segments;
    try {
      const content = data.choices[0].message.content;
      // Clean the content string and parse JSON
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      segments = JSON.parse(cleanContent);
      
      if (!Array.isArray(segments) || segments.length !== 10) {
        throw new Error('Invalid segments array');
      }
      
      console.log('Successfully parsed segments:', segments);
    } catch (error) {
      console.error('Error parsing segments:', error);
      throw new Error(`Failed to parse segments: ${error.message}`);
    }

    // Create story content
    const { data: storyContent, error: storyError } = await supabaseClient
      .from('story_contents')
      .insert([{ lecture_id: lectureId }])
      .select()
      .single();

    if (storyError) {
      console.error('Error creating story content:', storyError);
      throw new Error('Failed to create story content');
    }

    // Create story segments
    const segmentPromises = segments.map((segment: any, index: number) => {
      return supabaseClient
        .from('story_segments')
        .insert([{
          story_content_id: storyContent.id,
          segment_number: index,
          title: segment.title,
          content: {
            slides: segment.slides,
            questions: segment.questions
          },
          is_generated: true
        }]);
    });

    await Promise.all(segmentPromises);
    console.log('Successfully created all segments');

    return new Response(
      JSON.stringify({ storyContent: { segments } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-story-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
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
    console.log('Generating detailed story content for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture?.content) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

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
            content: `You are an expert educational content creator. Generate exactly 10 highly detailed segments for this lecture content.
            IMPORTANT: Analyze the language of the provided lecture content and generate all content (titles, descriptions, slides, questions) in the SAME LANGUAGE as the lecture.
            
            Each segment should have:
            1. A clear, descriptive title that accurately represents the topic
            2. Two comprehensive theory slides that include:
               - Detailed explanations of concepts with real-world examples
               - Clear definitions of key terms in bold
               - Step-by-step breakdowns of processes where applicable
               - Relevant analogies to aid understanding
               - Practical applications and use cases
               - Visual descriptions (diagrams, charts) where helpful
               - Citations or references to important sources if relevant
               - Bullet points for easy reading
               - Numbered lists for sequential information
            3. Two challenging but fair quiz questions
            
            Rules for content:
            1. Keep all content in the same language as the lecture
            2. Make content engaging and story-like while maintaining academic rigor
            3. Ensure questions test deep understanding progressively
            4. Include detailed, practical examples in slides
            5. Make sure all 10 segments are generated
            6. Questions should be challenging but fair
            7. Use markdown formatting for better readability
            
            Format the response as a clean JSON array with exactly 10 segments, each containing:
            {
              "id": "segment-[number]",
              "title": "Clear segment title",
              "description": "Comprehensive segment description",
              "slides": [
                {
                  "id": "slide-1",
                  "content": "Detailed, structured content with examples"
                },
                {
                  "id": "slide-2",
                  "content": "More structured content with practical applications"
                }
              ],
              "questions": [
                {
                  "id": "q1",
                  "type": "multiple_choice",
                  "question": "Detailed question testing deep understanding",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "correctAnswer": "Correct option",
                  "explanation": "Comprehensive explanation of the correct answer"
                },
                {
                  "id": "q2",
                  "type": "true_false",
                  "question": "Challenging true/false question",
                  "correctAnswer": true,
                  "explanation": "Detailed explanation linking to theory"
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
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      segments = JSON.parse(cleanContent);
      
      if (!Array.isArray(segments) || segments.length !== 10) {
        console.error('Invalid segments array length:', segments?.length);
        throw new Error('Invalid segments array - must have exactly 10 segments');
      }
      
      segments.forEach((segment, index) => {
        if (!segment.slides || segment.slides.length !== 2) {
          throw new Error(`Segment ${index + 1} must have exactly 2 slides`);
        }
        if (!segment.questions || segment.questions.length !== 2) {
          throw new Error(`Segment ${index + 1} must have exactly 2 questions`);
        }
      });
      
      console.log('Successfully parsed and validated segments:', segments);
    } catch (error) {
      console.error('Error parsing segments:', error);
      throw new Error(`Failed to parse segments: ${error.message}`);
    }

    const { data: storyContent, error: storyError } = await supabaseClient
      .from('story_contents')
      .insert([{ lecture_id: lectureId }])
      .select()
      .single();

    if (storyError) {
      console.error('Error creating story content:', storyError);
      throw new Error('Failed to create story content');
    }

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
    console.log('Successfully created all 10 segments with detailed content');

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
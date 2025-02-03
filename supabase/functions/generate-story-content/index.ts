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
            content: `You are an educational content creator. Analyze the lecture content and create 5 meaningful segment titles that:
            1. Follow a logical progression through the material
            2. Use specific, descriptive names based on the actual content
            3. Help learners understand the topic progression
            
            Return the titles as a simple JSON array of strings, with no additional formatting or markdown.
            Example format: ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]`
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
    console.log('Raw OpenAI response:', openAIResponse);
    
    let segmentTitles;
    try {
      // Extract the content and parse it as JSON, removing any markdown formatting
      const content = openAIResponse.choices[0].message.content.trim();
      segmentTitles = JSON.parse(content);
      console.log('Parsed segment titles:', segmentTitles);
    } catch (error) {
      console.error('Error parsing segment titles:', error);
      throw new Error('Failed to parse segment titles from OpenAI response');
    }

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

    // Split content into segments
    const contentWords = lecture.content.split(' ');
    const wordsPerSegment = Math.ceil(contentWords.length / segmentTitles.length);
    
    // Create segments
    for (let i = 0; i < segmentTitles.length; i++) {
      const start = i * wordsPerSegment;
      const end = Math.min((i + 1) * wordsPerSegment, contentWords.length);
      const segmentContent = contentWords.slice(start, end).join(' ');

      // Generate structured content for this segment
      const structuredResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `Create structured educational content for the segment "${segmentTitles[i]}". The content should include:

              1. Two theory slides that:
                 - Use clear bullet points and numbered lists
                 - Highlight key terms in **bold**
                 - Include examples where relevant
                 - Keep points concise and focused
              
              2. Two quiz questions that:
                 - Test understanding of specific concepts from the slides
                 - Include clear explanations for correct/incorrect answers
                 - Mix true/false and multiple choice formats
              
              Return the content as a JSON object with this exact structure (no markdown formatting):
              {
                "slides": [
                  {
                    "id": "slide-1",
                    "content": "• Point 1\\n• Point 2\\n• Point 3"
                  },
                  {
                    "id": "slide-2",
                    "content": "1. Step one\\n2. Step two\\n3. Step three"
                  }
                ],
                "questions": [
                  {
                    "id": "q1",
                    "type": "multiple_choice",
                    "question": "Question text",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correctAnswer": "Option A",
                    "explanation": "Explanation text"
                  },
                  {
                    "id": "q2",
                    "type": "true_false",
                    "question": "Question text",
                    "correctAnswer": true,
                    "explanation": "Explanation text"
                  }
                ]
              }`
            },
            {
              role: 'user',
              content: segmentContent
            }
          ],
          temperature: 0.7,
        }),
      });

      if (!structuredResponse.ok) {
        throw new Error(`OpenAI API error for segment ${i}: ${structuredResponse.status}`);
      }

      const structuredData = await structuredResponse.json();
      const content = JSON.parse(structuredData.choices[0].message.content);

      const { error: segmentError } = await supabaseClient
        .from('story_segments')
        .insert({
          story_content_id: storyContent.id,
          segment_number: i,
          title: segmentTitles[i],
          content,
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
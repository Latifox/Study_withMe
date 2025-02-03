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

    if (lectureError || !lecture?.content) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Lecture content not found');
    }

    console.log('Fetched lecture content, generating segments...');

    // Generate segment titles
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `Analyze the lecture content and create 5 meaningful segment titles that follow a logical progression. Return ONLY a JSON array of strings, no markdown or additional text.

            Example of expected format:
            ["Introduction to Key Concepts", "Understanding Core Principles", "Advanced Applications", "Case Studies", "Future Implications"]`
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

    const openAIResponse = await response.json();
    console.log('Raw OpenAI response for titles:', openAIResponse);
    
    let segmentTitles;
    try {
      const content = openAIResponse.choices[0].message.content.trim();
      segmentTitles = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
      console.log('Parsed segment titles:', segmentTitles);
    } catch (error) {
      console.error('Error parsing segment titles:', error);
      throw new Error('Failed to parse segment titles');
    }

    // Create story content entry
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

    console.log('Created story content, generating segments...');

    // Create segments with structured content
    for (let i = 0; i < segmentTitles.length; i++) {
      const structuredResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `Create structured educational content for the segment "${segmentTitles[i]}". Return ONLY a JSON object with this exact structure, no markdown:

              {
                "slides": [
                  {
                    "id": "slide-1",
                    "content": "• Main point 1\\n  - Subpoint 1.1\\n  - Subpoint 1.2\\n• Main point 2\\n  - Subpoint 2.1\\n  - Subpoint 2.2"
                  },
                  {
                    "id": "slide-2",
                    "content": "1. Step one explanation\\n2. Step two explanation\\n3. Step three explanation"
                  }
                ],
                "questions": [
                  {
                    "id": "q1",
                    "type": "multiple_choice",
                    "question": "Question about the content from slides?",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correctAnswer": "Option A",
                    "explanation": "Explanation referencing the theory"
                  },
                  {
                    "id": "q2",
                    "type": "true_false",
                    "question": "True/False question about key concept",
                    "correctAnswer": true,
                    "explanation": "Explanation linking to theory"
                  }
                ]
              }`
            },
            {
              role: 'user',
              content: `Create educational content about: ${segmentTitles[i]}\n\nContext: ${lecture.content}`
            }
          ],
          temperature: 0.7,
        }),
      });

      if (!structuredResponse.ok) {
        console.error(`OpenAI API error for segment ${i}:`, structuredResponse.status);
        throw new Error(`OpenAI API error for segment ${i}: ${structuredResponse.status}`);
      }

      const structuredData = await structuredResponse.json();
      console.log(`Raw OpenAI response for segment ${i}:`, structuredData);

      let content;
      try {
        const rawContent = structuredData.choices[0].message.content.trim();
        content = JSON.parse(rawContent.replace(/```json\n?|\n?```/g, '').trim());
        console.log(`Parsed content for segment ${i}:`, content);
      } catch (error) {
        console.error(`Error parsing content for segment ${i}:`, error);
        throw new Error(`Failed to parse content for segment ${i}`);
      }

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

      console.log(`Successfully created segment ${i}`);
    }

    console.log('Successfully generated all segments');
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
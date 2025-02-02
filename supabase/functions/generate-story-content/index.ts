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

    // Fetch both lecture content and AI configuration
    const [{ data: lecture, error: lectureError }, { data: aiConfig }] = await Promise.all([
      supabaseClient
        .from('lectures')
        .select('content, title')
        .eq('id', lectureId)
        .single(),
      supabaseClient
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .single()
    ]);

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    if (!lecture?.content) {
      throw new Error('No lecture content found');
    }

    // Use default values if no AI config is found
    const config = aiConfig || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      custom_instructions: ''
    };

    console.log('Fetched lecture title:', lecture.title);
    console.log('Content length:', lecture.content.length);
    console.log('Using AI config:', config);

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are an expert at creating educational content. Create an engaging learning journey based on lecture material. 
            
            Important parameters to consider:
            - Temperature: ${config.temperature} (higher means more varied and creative responses)
            - Creativity Level: ${config.creativity_level} (higher means more creative and engaging content)
            - Detail Level: ${config.detail_level} (higher means more detailed explanations)
            ${config.custom_instructions ? `\nCustom Instructions:\n${config.custom_instructions}` : ''}
            
            Requirements:
            - Create EXACTLY 10 segments
            - Each segment must have EXACTLY 2 theory slides and 2 quiz questions
            - Keep the original language of the lecture content
            - Make content progressively more challenging
            - Ensure logical flow between segments
            
            Return ONLY a raw JSON object (no markdown, no code blocks) with this structure:
            {
              "segments": [
                {
                  "id": "segment-1",
                  "title": "Section Title",
                  "slides": [
                    {
                      "id": "slide-1-1",
                      "content": "Slide content in the lecture's original language"
                    },
                    {
                      "id": "slide-1-2",
                      "content": "Slide content in the lecture's original language"
                    }
                  ],
                  "questions": [
                    {
                      "id": "question-1-1",
                      "type": "multiple_choice",
                      "question": "Question text in the lecture's original language",
                      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                      "correctAnswer": "Correct option text",
                      "explanation": "Explanation in the lecture's original language"
                    },
                    {
                      "id": "question-1-2",
                      "type": "multiple_choice",
                      "question": "Question text in the lecture's original language",
                      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                      "correctAnswer": "Correct option text",
                      "explanation": "Explanation in the lecture's original language"
                    }
                  ]
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Create a comprehensive learning journey with 10 segments for this lecture titled "${lecture.title}". Here's the content to teach: ${lecture.content}`
          }
        ],
        temperature: config.temperature,
        max_tokens: 4000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error('Failed to generate content with OpenAI');
    }

    const aiResponseData = await openAIResponse.json();
    console.log('Received response from OpenAI');

    if (!aiResponseData.choices?.[0]?.message?.content) {
      console.error('Invalid AI response structure:', aiResponseData);
      throw new Error('Invalid AI response structure');
    }

    let storyContent;
    try {
      const rawContent = aiResponseData.choices[0].message.content;
      console.log('Raw AI response:', rawContent);
      
      // Clean up any potential markdown formatting
      const cleanedContent = rawContent
        .replace(/```json\n?/g, '')  // Remove ```json
        .replace(/```\n?/g, '')      // Remove closing ```
        .trim();                     // Remove extra whitespace
      
      console.log('Cleaned content:', cleanedContent);
      storyContent = JSON.parse(cleanedContent);
      
      // Validate the structure
      if (!storyContent.segments || !Array.isArray(storyContent.segments)) {
        throw new Error('Invalid story content structure: missing segments array');
      }

      // Validate each segment
      if (storyContent.segments.length !== 10) {
        throw new Error(`Invalid number of segments: expected 10, got ${storyContent.segments.length}`);
      }

      storyContent.segments.forEach((segment: any, index: number) => {
        if (!segment.id || !segment.title || !Array.isArray(segment.slides) || !Array.isArray(segment.questions)) {
          throw new Error(`Invalid segment structure at index ${index}`);
        }
        if (segment.slides.length !== 2 || segment.questions.length !== 2) {
          throw new Error(`Incorrect number of slides or questions in segment ${index}`);
        }
      });

      console.log('Successfully validated story content structure with 10 segments');

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    return new Response(
      JSON.stringify({ storyContent }),
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
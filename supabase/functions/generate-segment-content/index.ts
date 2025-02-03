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

    // Generate content using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a helpful teaching assistant. Generate educational content based on the provided lecture content.
            Focus on the following segment: "${segmentTitle}".
            
            Create:
            1. Two theory slides with 3 paragraphs each
            2. Two quiz questions (one multiple choice, one true/false)
            
            Return the response in this exact JSON format:
            {
              "slides": [
                {
                  "id": "slide-1",
                  "content": "First slide content with 3 paragraphs"
                },
                {
                  "id": "slide-2",
                  "content": "Second slide content with 3 paragraphs"
                }
              ],
              "questions": [
                {
                  "type": "multiple_choice",
                  "question": "Question text",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "correctAnswer": "Correct option",
                  "explanation": "Why this is correct"
                },
                {
                  "type": "true_false",
                  "question": "True/False question text",
                  "correctAnswer": true,
                  "explanation": "Why this is true/false"
                }
              ]
            }`
          },
          {
            role: 'user',
            content: lectureContent
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
    console.log('Raw OpenAI response:', openAIResponse);

    let content;
    try {
      const contentStr = openAIResponse.choices[0].message.content;
      content = JSON.parse(contentStr);
      console.log('Parsed content:', content);
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      throw new Error('Failed to parse generated content');
    }

    // Get the story content id
    const { data: storyContent, error: storyError } = await supabaseClient
      .from('story_contents')
      .select('id')
      .eq('lecture_id', lectureId)
      .single();

    if (storyError) {
      console.error('Error fetching story content:', storyError);
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
      console.error('Error storing segment content:', segmentError);
      throw new Error('Failed to store segment content');
    }

    console.log('Successfully generated and stored content for segment:', segmentNumber);
    
    return new Response(
      JSON.stringify({ content: segmentContent }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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
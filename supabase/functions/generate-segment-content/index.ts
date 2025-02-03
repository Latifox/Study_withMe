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
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an educational content creator. Create structured, easy-to-follow content for the segment "${segmentTitle}".
            
            Rules for content creation:
            1. Theory slides should be highly structured with:
               - Clear bullet points
               - Numbered lists for steps/processes
               - Short, concise paragraphs
               - Key terms in bold
               - Examples where relevant
            
            2. Quiz questions should:
               - Test understanding of specific concepts from the theory slides
               - Include clear explanations for why answers are correct/incorrect
               - Mix of multiple choice and true/false questions
               - Gradually increase in difficulty
            
            Return the content in this exact JSON format:
            {
              "slides": [
                {
                  "id": "slide-1",
                  "content": "Structured content with bullet points and lists"
                },
                {
                  "id": "slide-2",
                  "content": "More structured content focusing on examples and applications"
                }
              ],
              "questions": [
                {
                  "id": "q1",
                  "type": "multiple_choice",
                  "question": "Question testing a specific concept from the slides",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "correctAnswer": "Correct option",
                  "explanation": "Detailed explanation referencing the theory"
                },
                {
                  "id": "q2",
                  "type": "true_false",
                  "question": "True/False question about a key concept",
                  "correctAnswer": true,
                  "explanation": "Explanation linking back to the theory"
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
      .from('story_segments')
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
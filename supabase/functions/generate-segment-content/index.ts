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
    const { lectureId, segmentNumber, segmentTitle } = await req.json();
    console.log('Received parameters:', { lectureId, segmentNumber, segmentTitle });

    // Validate parameters
    if (!lectureId || segmentNumber === undefined || !segmentTitle) {
      console.error('Missing parameters:', { lectureId, segmentNumber, segmentTitle });
      throw new Error('Missing required parameters');
    }

    // Adjust segmentNumber to be 1-based for database operations
    const adjustedSegmentNumber = segmentNumber + 1;
    console.log('Adjusted segment number:', adjustedSegmentNumber);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the lecture content
    console.log('Fetching lecture content...');
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error(`Failed to fetch lecture: ${lectureError.message}`);
    }

    if (!lecture?.content) {
      console.error('No lecture content found');
      throw new Error('Lecture content not found');
    }

    // Get story structure
    console.log('Fetching story structure...');
    const { data: storyStructure, error: structureError } = await supabaseClient
      .from('story_structures')
      .select('id')
      .eq('lecture_id', lectureId)
      .single();

    if (structureError) {
      console.error('Error fetching story structure:', structureError);
      throw new Error(`Failed to fetch story structure: ${structureError.message}`);
    }

    console.log('Calling OpenAI API...');
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
            content: `Generate detailed content for the segment "${segmentTitle}".
            
            Rules for content:
            1. Theory slides should include:
               - Clear explanations with examples
               - Key terms in **bold**
               - Step-by-step breakdowns
               - Practical examples
               - Visual descriptions
               - Bullet points and numbered lists
            
            2. Quiz questions should:
               - Test understanding of specific concepts
               - Include clear explanations
               - Be challenging but fair
            
            Return content in this exact format:
            {
              "theory_slide_1": "Markdown formatted content",
              "theory_slide_2": "More markdown formatted content",
              "quiz_question_1": {
                "type": "multiple_choice",
                "question": "Question text",
                "options": ["A", "B", "C", "D"],
                "correctAnswer": "Correct option",
                "explanation": "Why this is correct"
              },
              "quiz_question_2": {
                "type": "true_false",
                "question": "True/false question",
                "correctAnswer": true,
                "explanation": "Why this is true/false"
              }
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
      console.error('OpenAI API error:', response.status, await response.text());
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw OpenAI response:', data);

    let content;
    try {
      content = JSON.parse(data.choices[0].message.content);
      console.log('Parsed content:', content);
    } catch (error) {
      console.error('Error parsing content:', error);
      throw new Error('Failed to parse generated content');
    }

    // Get the next ID from the sequence
    console.log('Getting next segment content ID...');
    const { data: nextId, error: nextIdError } = await supabaseClient.rpc('get_next_segment_content_id');
    
    if (nextIdError) {
      console.error('Error getting next ID:', nextIdError);
      throw new Error(`Failed to get next ID: ${nextIdError.message}`);
    }

    console.log('Next ID:', nextId);
    
    // Store the segment content
    console.log('Storing segment content...');
    const { data: segmentContent, error: segmentError } = await supabaseClient
      .from('segment_contents')
      .insert({
        id: nextId,
        story_structure_id: storyStructure.id,
        segment_number: adjustedSegmentNumber,
        theory_slide_1: content.theory_slide_1,
        theory_slide_2: content.theory_slide_2,
        quiz_question_1: content.quiz_question_1,
        quiz_question_2: content.quiz_question_2
      })
      .select()
      .single();

    if (segmentError) {
      console.error('Error storing segment content:', segmentError);
      throw new Error(`Failed to store segment content: ${segmentError.message}`);
    }

    console.log('Successfully generated and stored content for segment:', adjustedSegmentNumber);
    
    return new Response(
      JSON.stringify({ segmentContent }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
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

    if (!lectureId || segmentNumber === undefined || !segmentTitle) {
      throw new Error('Missing required parameters');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the lecture content
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
      throw new Error('Lecture content not found');
    }

    // Get story structure
    const { data: storyStructure, error: structureError } = await supabaseClient
      .from('story_structures')
      .select('id')
      .eq('lecture_id', lectureId)
      .single();

    if (structureError) {
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
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Generate educational content for the segment "${segmentTitle}" in the same language as the lecture content.
            
            Return a JSON object with the following structure (DO NOT include markdown formatting or code blocks):
            {
              "theory_slide_1": "First slide content with clear explanations",
              "theory_slide_2": "Second slide content with examples",
              "quiz_question_1": {
                "type": "multiple_choice",
                "question": "Question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
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
            content: `Generate content for segment "${segmentTitle}" based on this lecture content: ${lecture.content}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw OpenAI response:', data);

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid OpenAI response format');
    }

    let content;
    try {
      // Remove any markdown formatting
      const cleanContent = data.choices[0].message.content.replace(/```json\n|\n```/g, '');
      content = JSON.parse(cleanContent);
      
      // Validate content structure
      if (!content.theory_slide_1 || !content.theory_slide_2 || 
          !content.quiz_question_1 || !content.quiz_question_2) {
        throw new Error('Missing required content fields');
      }
      
      console.log('Successfully parsed content');
    } catch (error) {
      console.error('Error parsing content:', error);
      throw new Error(`Failed to parse generated content: ${error.message}`);
    }

    // Get the next ID from the sequence
    const { data: nextId, error: nextIdError } = await supabaseClient.rpc('get_next_segment_content_id');
    
    if (nextIdError) {
      throw new Error(`Failed to get next ID: ${nextIdError.message}`);
    }
    
    // Store the segment content
    const { data: segmentContent, error: segmentError } = await supabaseClient
      .from('segment_contents')
      .insert({
        id: nextId,
        story_structure_id: storyStructure.id,
        segment_number: segmentNumber + 1,
        theory_slide_1: content.theory_slide_1,
        theory_slide_2: content.theory_slide_2,
        quiz_question_1: content.quiz_question_1,
        quiz_question_2: content.quiz_question_2
      })
      .select()
      .single();

    if (segmentError) {
      throw new Error(`Failed to store segment content: ${segmentError.message}`);
    }

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
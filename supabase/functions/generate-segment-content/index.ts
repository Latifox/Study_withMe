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
    console.log('Generating content for:', { lectureId, segmentNumber, segmentTitle });

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

    if (lectureError) throw new Error(`Failed to fetch lecture: ${lectureError.message}`);
    if (!lecture?.content) throw new Error('Lecture content not found');

    // Get or create story structure
    const { data: storyStructure, error: structureError } = await supabaseClient
      .from('story_structures')
      .select('id')
      .eq('lecture_id', lectureId)
      .single();

    if (structureError && structureError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch story structure: ${structureError.message}`);
    }

    console.log('Calling OpenAI API for detailed content generation...');
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
            content: `Generate comprehensive educational content for the segment "${segmentTitle}". 
            The content should be extremely detailed, including:
            - In-depth explanations of core concepts
            - Real-world examples and applications
            - Clear definitions of technical terms
            - Step-by-step breakdowns of complex ideas
            - Visual descriptions where relevant
            
            Return a JSON object with the following structure (DO NOT include markdown formatting):
            {
              "theory_slide_1": "Detailed introduction and core concept explanation (at least 300 words)",
              "theory_slide_2": "Comprehensive examples and practical applications (at least 300 words)",
              "quiz_question_1": {
                "type": "multiple_choice",
                "question": "Challenging question that tests deep understanding",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": "Correct option",
                "explanation": "Detailed explanation of why this answer is correct"
              },
              "quiz_question_2": {
                "type": "true_false",
                "question": "Complex true/false question",
                "correctAnswer": true,
                "explanation": "Comprehensive explanation of the correct answer"
              }
            }`
          },
          {
            role: 'user',
            content: `Generate detailed educational content for segment "${segmentTitle}" based on this lecture content: ${lecture.content}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

    const data = await response.json();
    console.log('Successfully received OpenAI response');

    let content;
    try {
      const cleanContent = data.choices[0].message.content.replace(/```json\n|\n```/g, '');
      content = JSON.parse(cleanContent);
      
      if (!content.theory_slide_1 || !content.theory_slide_2 || 
          !content.quiz_question_1 || !content.quiz_question_2) {
        throw new Error('Missing required content fields');
      }
    } catch (error) {
      console.error('Error parsing content:', error);
      throw new Error(`Failed to parse generated content: ${error.message}`);
    }

    // Store the content
    const { data: segmentContent, error: insertError } = await supabaseClient
      .from('segment_contents')
      .upsert({
        story_structure_id: storyStructure.id,
        segment_number: segmentNumber,
        theory_slide_1: content.theory_slide_1,
        theory_slide_2: content.theory_slide_2,
        quiz_question_1: content.quiz_question_1,
        quiz_question_2: content.quiz_question_2
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to store segment content: ${insertError.message}`);
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
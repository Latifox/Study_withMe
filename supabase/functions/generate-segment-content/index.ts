
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

    // Check for existing content first
    const { data: storyStructure, error: structureError } = await supabaseClient
      .from('story_structures')
      .select('id')
      .eq('lecture_id', lectureId)
      .single();

    if (structureError) {
      console.error('Failed to fetch story structure:', structureError);
      throw new Error(`Failed to fetch story structure: ${structureError.message}`);
    }

    const { data: existingContent } = await supabaseClient
      .from('segment_contents')
      .select('*')
      .eq('story_structure_id', storyStructure.id)
      .eq('segment_number', segmentNumber)
      .single();

    if (existingContent) {
      console.log('Content already exists, returning existing content');
      return new Response(
        JSON.stringify({ segmentContent: existingContent }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture?.content) {
      console.error('Failed to fetch lecture:', lectureError);
      throw new Error('Lecture content not found');
    }

    console.log('Calling OpenAI API for content generation...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // Reduced to 20 second timeout

    try {
      const prompt = `Create engaging, visually appealing content for segment "${segmentTitle}" from this lecture: ${lecture.content}

Guidelines:
1. Use markdown headers (##, ###)
2. Break content into digestible paragraphs
3. Use emojis for key points 🎯
4. Include bullet points and lists
5. Bold important terms
6. Add examples where relevant

Return a JSON object with:
{
  "theory_slide_1": "Core concepts with markdown",
  "theory_slide_2": "Applications and examples",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "Test question",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "Answer",
    "explanation": "Why"
  },
  "quiz_question_2": {
    "type": "true_false",
    "question": "True/false question",
    "correctAnswer": true,
    "explanation": "Why"
  }
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational content creator.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

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

      const { data: segmentContent, error: insertError } = await supabaseClient
        .from('segment_contents')
        .insert({
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
        console.error('Error storing segment content:', insertError);
        throw new Error(`Failed to store segment content: ${insertError.message}`);
      }

      return new Response(
        JSON.stringify({ segmentContent }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('Request timed out while generating content');
        throw new Error('Request timed out while generating content');
      }
      throw error;
    }
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

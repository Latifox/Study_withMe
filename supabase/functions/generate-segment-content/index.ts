
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
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

    try {
      const prompt = `Create comprehensive educational content for segment "${segmentTitle}". The content should be thorough yet accessible.

REQUIREMENTS:

For Theory Slides:
1. Each slide should use proper markdown formatting
2. Include clear headings (##, ###)
3. Break content into digestible paragraphs
4. Use bullet points and numbered lists where appropriate
5. Highlight key terms using **bold**
6. Add relevant emojis 🎯 to emphasize important points
7. Include practical examples and real-world applications
8. Ensure content flows logically from basic to advanced concepts

Theory Slide 1 should focus on:
- Core concepts and definitions
- Fundamental principles
- Key terminology
- Basic theoretical framework

Theory Slide 2 should focus on:
- Practical applications
- Real-world examples
- Case studies or scenarios
- Common misconceptions and clarifications

For Quiz Questions:
1. Multiple Choice Question should:
   - Test understanding, not just memorization
   - Have clearly distinct options
   - Include one clearly correct answer
   - Have plausible but incorrect distractors
   - Provide a detailed explanation

2. True/False Question should:
   - Test application of concepts
   - Be unambiguous
   - Include a thorough explanation
   - Connect to the theory content

Return JSON in this format (NO MARKDOWN CODE BLOCKS):
{
  "theory_slide_1": "Core concepts and fundamentals in markdown",
  "theory_slide_2": "Applications and examples in markdown",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "Thought-provoking question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Correct option",
    "explanation": "Detailed explanation of why this is correct"
  },
  "quiz_question_2": {
    "type": "true_false",
    "question": "Clear true/false statement",
    "correctAnswer": true,
    "explanation": "Thorough explanation of the correct answer"
  }
}

Base your content on this lecture material: ${lecture.content}

Remember to:
- Keep language clear and professional
- Maintain consistent depth across all content
- Ensure all content is directly relevant to "${segmentTitle}"
- Make complex concepts accessible without oversimplifying
- DO NOT wrap the response in markdown code blocks
- Properly escape any quotes or special characters in the content`;

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
              content: 'You are an expert educational content creator. Create engaging, comprehensive, and clear content that follows best practices in educational design. Return only valid JSON without markdown code blocks.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
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
        // Remove any markdown code block indicators and clean the response
        const responseContent = data.choices[0].message.content;
        console.log('Raw response content:', responseContent);
        
        // Clean the content by removing markdown code blocks and any leading/trailing whitespace
        const cleanContent = responseContent
          .replace(/```json\s*|\s*```/g, '')
          .trim();
        
        console.log('Cleaned content:', cleanContent);
        
        // Parse the cleaned content
        content = JSON.parse(cleanContent);
        
        // Validate the required fields
        const requiredFields = ['theory_slide_1', 'theory_slide_2', 'quiz_question_1', 'quiz_question_2'];
        const missingFields = requiredFields.filter(field => !content[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Validate quiz question structure
        if (!content.quiz_question_1.type || !content.quiz_question_1.question || 
            !content.quiz_question_1.options || !content.quiz_question_1.correctAnswer || 
            !content.quiz_question_1.explanation) {
          throw new Error('Invalid multiple choice question structure');
        }
        
        if (!content.quiz_question_2.type || !content.quiz_question_2.question || 
            typeof content.quiz_question_2.correctAnswer !== 'boolean' || 
            !content.quiz_question_2.explanation) {
          throw new Error('Invalid true/false question structure');
        }
      } catch (error) {
        console.error('Error parsing or validating content:', error);
        console.error('Failed content:', data.choices[0].message.content);
        throw new Error(`Failed to parse or validate generated content: ${error.message}`);
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

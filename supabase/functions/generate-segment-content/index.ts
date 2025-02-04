
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
      const prompt = `Create highly engaging and detailed educational content for the segment "${segmentTitle}". Format the response as a STRICT JSON object with carefully escaped strings.

REQUIREMENTS FOR CONTENT STYLE:
1. Make content addictive and engaging using storytelling techniques
2. Use markdown formatting extensively for visual hierarchy:
   - **Bold** for key concepts and important terms
   - ## Headers for main sections
   - * Bullet points for lists
   - > Blockquotes for important insights
   - --- for section breaks
   - \`code\` for technical terms or specific vocabulary
3. Include real-world examples and analogies
4. Break down complex concepts into digestible chunks
5. Use a conversational, engaging tone
6. Include "Did you know?" sections for interesting facts
7. Add emojis 🎯 strategically to highlight key points
8. Create clear visual hierarchy with markdown

Required JSON Structure (with proper string escaping):
{
  "theory_slide_1": "string with markdown (escaped quotes) - Introduction and core concepts",
  "theory_slide_2": "string with markdown (escaped quotes) - Detailed examples and applications",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "string",
    "options": ["string array"],
    "correctAnswer": "string matching one option",
    "explanation": "string with markdown"
  },
  "quiz_question_2": {
    "type": "true_false",
    "question": "string",
    "correctAnswer": boolean,
    "explanation": "string with markdown"
  }
}

THEORY SLIDE STRUCTURE GUIDELINES:
Slide 1 (Core Concepts):
- Start with an engaging hook or question
- Use ## Main Concept as header
- Break down key points with **bold** terms
- Include a > blockquote for key insight
- Add a "Did you know? 🤔" section
- End with a real-world connection

Slide 2 (Applications):
- Begin with a practical scenario
- Use bullet points for examples
- Include code examples if relevant
- Add a "Pro Tip 💡" section
- Conclude with practical applications
- Use emojis for visual engagement

Base the content on this lecture material: ${lecture.content.replace(/"/g, '\\"')}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational content creator specializing in creating engaging, addictive learning experiences. Return ONLY a valid JSON object with proper string escaping. NO markdown code blocks.'
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
        // Remove any potential formatting and clean the response
        const responseContent = data.choices[0].message.content;
        console.log('Raw response content:', responseContent);
        
        // Clean and sanitize the content
        const cleanContent = responseContent
          .replace(/```json\s*|\s*```/g, '') // Remove code blocks
          .replace(/[\u2018\u2019]/g, "'")   // Replace smart quotes
          .replace(/[\u201C\u201D]/g, '"')   // Replace smart double quotes
          .trim();
        
        console.log('Cleaned content:', cleanContent);
        
        // Parse the cleaned content
        content = JSON.parse(cleanContent);
        
        // Validate required fields
        const requiredFields = ['theory_slide_1', 'theory_slide_2', 'quiz_question_1', 'quiz_question_2'];
        const missingFields = requiredFields.filter(field => !content[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Escape any remaining unescaped quotes in theory slides
        content.theory_slide_1 = content.theory_slide_1.replace(/(?<!\\)"/g, '\\"');
        content.theory_slide_2 = content.theory_slide_2.replace(/(?<!\\)"/g, '\\"');
        
        // Validate quiz questions structure
        const validateQuizQuestion = (question: any, type: string) => {
          if (!question.type || !question.question || !question.explanation) {
            throw new Error(`Invalid ${type} question structure: missing required fields`);
          }
          
          if (type === 'multiple_choice') {
            if (!Array.isArray(question.options) || question.options.length < 2) {
              throw new Error('Multiple choice question must have at least 2 options');
            }
            if (!question.options.includes(question.correctAnswer)) {
              throw new Error('Correct answer must be one of the options');
            }
          } else if (type === 'true_false') {
            if (typeof question.correctAnswer !== 'boolean') {
              throw new Error('True/False question must have a boolean correct answer');
            }
          }
        };

        validateQuizQuestion(content.quiz_question_1, 'multiple_choice');
        validateQuizQuestion(content.quiz_question_2, 'true_false');
        
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

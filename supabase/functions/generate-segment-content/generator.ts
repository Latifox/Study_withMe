
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateContent } from './validator.ts';
import { SegmentContent, ApiResponse } from './types.ts';

// Access environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';

// Initialize the client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generates theory content for a specific segment
 */
export async function generateTheoryContent(
  lectureContent: string,
  segmentNumber: number,
  segmentTitle: string,
  segmentDescription: string,
  contentLanguage: string = 'english'
): Promise<{ slide1: string; slide2: string }> {
  console.log(`Generating theory content for segment ${segmentNumber}: ${segmentTitle}`);
  
  try {
    // Create a structured prompt for OpenAI
    const prompt = `
    You are an educational content creator tasked with creating engaging theory slides for a lecture segment.

    SEGMENT NUMBER: ${segmentNumber}
    SEGMENT TITLE: ${segmentTitle}
    SEGMENT DESCRIPTION: ${segmentDescription}
    CONTENT LANGUAGE: ${contentLanguage}

    LECTURE CONTENT:
    ${lectureContent.substring(0, 4000)}... (truncated)

    Create TWO theory slides for this segment. The slides should:
    - Be written in proper Markdown format with clear structure
    - Use headings, bullet points, and emphasis appropriately
    - Be educational, clear, and engaging
    - Focus specifically on the segment topic described
    - Be reasonably concise for a slide (about 250-350 words per slide)
    - Use appropriate formatting for mathematical notations if needed
    - Be written in ${contentLanguage}
    - Have different sub-topics on each slide (not repetitive)

    IMPORTANT: Structure your response EXACTLY as follows:
    SLIDE 1:
    [Markdown content for slide 1]

    SLIDE 2:
    [Markdown content for slide 2]
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator that specializes in creating clear, engaging educational content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI API response received');
    
    // Extract the content from the response
    const content = data.choices[0].message.content.trim();
    
    // Parse the content to extract the slides
    // Use regex to extract content between SLIDE markers
    const slide1Regex = /SLIDE 1:([\s\S]*?)(?=SLIDE 2:|$)/;
    const slide2Regex = /SLIDE 2:([\s\S]*?)$/;
    
    const slide1Match = content.match(slide1Regex);
    const slide2Match = content.match(slide2Regex);
    
    if (!slide1Match || !slide2Match) {
      console.error('Failed to parse slides from OpenAI response. Raw content:', content);
      throw new Error('Failed to parse slides from OpenAI response');
    }
    
    const slide1 = slide1Match[1].trim();
    const slide2 = slide2Match[1].trim();
    
    console.log('Successfully generated theory content');
    
    return {
      slide1,
      slide2
    };
  } catch (error) {
    console.error('Error generating theory content:', error);
    throw new Error(`Failed to generate theory content: ${error.message}`);
  }
}

/**
 * Generates quiz content for a specific segment
 */
export async function generateQuizContent(
  lectureContent: string,
  segmentNumber: number,
  segmentTitle: string,
  segmentDescription: string,
  contentLanguage: string = 'english'
): Promise<{
  quiz1Type: string;
  quiz1Question: string;
  quiz1Options?: string[];
  quiz1CorrectAnswer: string;
  quiz1Explanation: string;
  quiz2Type: string;
  quiz2Question: string;
  quiz2CorrectAnswer: boolean;
  quiz2Explanation: string;
}> {
  console.log(`Generating quiz content for segment ${segmentNumber}: ${segmentTitle}`);
  
  try {
    // Create a structured prompt for OpenAI
    const prompt = `
    You are an educational content creator tasked with creating quiz questions for a lecture segment.

    SEGMENT NUMBER: ${segmentNumber}
    SEGMENT TITLE: ${segmentTitle}
    SEGMENT DESCRIPTION: ${segmentDescription}
    CONTENT LANGUAGE: ${contentLanguage}

    LECTURE CONTENT:
    ${lectureContent.substring(0, 4000)}... (truncated)

    Create TWO quiz questions for this segment:

    QUIZ 1: A multiple-choice question with 4 options
    QUIZ 2: A true/false question

    The quizzes should:
    - Test understanding of key concepts from the segment
    - Be challenging but fair
    - Include explanations for the correct answers
    - Be written in ${contentLanguage}

    Format your response exactly as follows:
    QUIZ_1_TYPE: multiple-choice
    QUIZ_1_QUESTION: [Question text]
    QUIZ_1_OPTIONS: ["Option A", "Option B", "Option C", "Option D"]
    QUIZ_1_CORRECT_ANSWER: [The correct option, exactly as written in options]
    QUIZ_1_EXPLANATION: [Explanation of why the answer is correct]

    QUIZ_2_TYPE: true-false
    QUIZ_2_QUESTION: [Question text formulated as a statement to be evaluated as true or false]
    QUIZ_2_CORRECT_ANSWER: [true or false]
    QUIZ_2_EXPLANATION: [Explanation of why the statement is true or false]
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator that specializes in creating clear, fair assessment questions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI API response received');
    
    // Extract the content from the response
    const content = data.choices[0].message.content.trim();
    
    // Parse the quiz content using regex
    const quiz1TypeMatch = content.match(/QUIZ_1_TYPE:\s*(.*)/);
    const quiz1QuestionMatch = content.match(/QUIZ_1_QUESTION:\s*(.*)/);
    const quiz1OptionsMatch = content.match(/QUIZ_1_OPTIONS:\s*(\[.*?\])/s);
    const quiz1CorrectAnswerMatch = content.match(/QUIZ_1_CORRECT_ANSWER:\s*(.*)/);
    const quiz1ExplanationMatch = content.match(/QUIZ_1_EXPLANATION:\s*(.*)/);
    
    const quiz2TypeMatch = content.match(/QUIZ_2_TYPE:\s*(.*)/);
    const quiz2QuestionMatch = content.match(/QUIZ_2_QUESTION:\s*(.*)/);
    const quiz2CorrectAnswerMatch = content.match(/QUIZ_2_CORRECT_ANSWER:\s*(.*)/);
    const quiz2ExplanationMatch = content.match(/QUIZ_2_EXPLANATION:\s*(.*)/);
    
    if (
      !quiz1TypeMatch || !quiz1QuestionMatch || !quiz1OptionsMatch || 
      !quiz1CorrectAnswerMatch || !quiz1ExplanationMatch || !quiz2TypeMatch || 
      !quiz2QuestionMatch || !quiz2CorrectAnswerMatch || !quiz2ExplanationMatch
    ) {
      console.error('Failed to parse quiz content from OpenAI response. Raw content:', content);
      throw new Error('Failed to parse quiz content from OpenAI response');
    }
    
    let quiz1Options;
    try {
      quiz1Options = JSON.parse(quiz1OptionsMatch[1]);
    } catch (error) {
      console.error('Failed to parse quiz1Options:', error);
      throw new Error('Failed to parse quiz1Options');
    }

    // The correct answer format for true-false should be a boolean, not a string
    let quiz2CorrectAnswer: boolean;
    const quiz2CorrectAnswerStr = quiz2CorrectAnswerMatch[1].trim().toLowerCase();
    if (quiz2CorrectAnswerStr === 'true') {
      quiz2CorrectAnswer = true;
    } else if (quiz2CorrectAnswerStr === 'false') {
      quiz2CorrectAnswer = false;
    } else {
      throw new Error(`Invalid quiz2CorrectAnswer: ${quiz2CorrectAnswerStr}. Expected 'true' or 'false'.`);
    }
    
    console.log('Successfully generated quiz content');
    
    return {
      quiz1Type: quiz1TypeMatch[1].trim(),
      quiz1Question: quiz1QuestionMatch[1].trim(),
      quiz1Options,
      quiz1CorrectAnswer: quiz1CorrectAnswerMatch[1].trim(),
      quiz1Explanation: quiz1ExplanationMatch[1].trim(),
      quiz2Type: quiz2TypeMatch[1].trim(),
      quiz2Question: quiz2QuestionMatch[1].trim(),
      quiz2CorrectAnswer,
      quiz2Explanation: quiz2ExplanationMatch[1].trim()
    };
  } catch (error) {
    console.error('Error generating quiz content:', error);
    throw new Error(`Failed to generate quiz content: ${error.message}`);
  }
}

/**
 * Main function to generate complete segment content
 */
export async function generateSegmentContent(
  lectureId: number,
  segmentNumber: number,
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  contentLanguage: string = 'english'
): Promise<ApiResponse> {
  console.log(`Generating full content for segment ${segmentNumber}`);
  
  try {
    // Generate theory content
    const theoryContent = await generateTheoryContent(
      lectureContent,
      segmentNumber,
      segmentTitle,
      segmentDescription,
      contentLanguage
    );
    
    // Generate quiz content
    const quizContent = await generateQuizContent(
      lectureContent,
      segmentNumber,
      segmentTitle,
      segmentDescription,
      contentLanguage
    );
    
    // Combine the content
    const segmentContent: SegmentContent = {
      theory_slide_1: theoryContent.slide1,
      theory_slide_2: theoryContent.slide2,
      quiz_1_type: quizContent.quiz1Type,
      quiz_1_question: quizContent.quiz1Question,
      quiz_1_options: quizContent.quiz1Options,
      quiz_1_correct_answer: quizContent.quiz1CorrectAnswer,
      quiz_1_explanation: quizContent.quiz1Explanation,
      quiz_2_type: quizContent.quiz2Type,
      quiz_2_question: quizContent.quiz2Question,
      quiz_2_correct_answer: quizContent.quiz2CorrectAnswer,
      quiz_2_explanation: quizContent.quiz2Explanation
    };
    
    // Validate the content
    const validationResult = validateContent(segmentContent);
    if (!validationResult.valid) {
      throw new Error(`Content validation failed: ${validationResult.errors.join(', ')}`);
    }
    
    console.log('Successfully generated and validated segment content');
    
    return {
      success: true,
      content: segmentContent
    };
  } catch (error) {
    console.error('Error in generateSegmentContent:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

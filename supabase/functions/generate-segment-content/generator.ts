
import { ApiResponse, SegmentContent } from './types.ts';

/**
 * Validates the generated content to ensure it meets requirements
 */
function validateContent(content: SegmentContent) {
  const errors = [];
  
  // Check if required theory content exists
  if (!content.theory_slide_1 || content.theory_slide_1.trim() === '') {
    errors.push('Theory slide 1 is missing or empty');
  }
  
  if (!content.theory_slide_2 || content.theory_slide_2.trim() === '') {
    errors.push('Theory slide 2 is missing or empty');
  }
  
  // Check if quiz content exists
  if (!content.quiz_1_question || content.quiz_1_question.trim() === '') {
    errors.push('Quiz 1 question is missing or empty');
  }
  
  if (!content.quiz_1_correct_answer) {
    errors.push('Quiz 1 correct answer is missing');
  }
  
  if (!content.quiz_2_question || content.quiz_2_question.trim() === '') {
    errors.push('Quiz 2 question is missing or empty');
  }
  
  if (content.quiz_2_correct_answer === undefined) {
    errors.push('Quiz 2 correct answer is missing');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate theory content for a segment
 */
async function generateTheoryContent(
  lectureContent: string,
  segmentNumber: number,
  segmentTitle: string,
  segmentDescription: string,
  contentLanguage: string = 'english'
): Promise<{ slide1: string; slide2: string }> {
  console.log(`Generating theory content for segment ${segmentNumber}: ${segmentTitle}`);
  
  const openai_key = Deno.env.get('OPENAI_API_KEY');
  if (!openai_key) {
    throw new Error('OpenAI API key not found in environment variables');
  }
  
  // Format the instruction for AI to generate theory content
  const instruction = `
    Create educational content for a lecture segment titled "${segmentTitle}" 
    with the following description: "${segmentDescription}".
    
    Use this lecture content as reference: "${lectureContent.substring(0, 4000)}..."
    
    Create two theory slides in ${contentLanguage} language:
    
    1. The first slide should introduce the concept and provide a clear, engaging explanation.
    2. The second slide should go deeper into the topic with examples, applications, or implications.
    
    Format both slides in markdown format and make sure they are clear, informative, and engaging for students.
    Each slide should contain about 250-300 words of well-formatted, educational content.
    
    Include headers, bullet points, bold text for important concepts, and other markdown formatting to make the content visually appealing and easy to understand.
  `;
  
  try {
    // API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openai_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert educational content creator. Create high-quality, concise, and engaging educational content in markdown format.'
          },
          { role: 'user', content: instruction }
        ],
        temperature: 0.5
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Split the content into two slides
    // This assumes the AI returns content with clear slide demarcation
    const slides = content.split(/Slide\s+2:|Second\s+Slide:/i);
    
    if (slides.length < 2) {
      console.warn('AI did not clearly split content into two slides');
      // Attempt a basic split if the AI didn't follow the format
      const midpoint = Math.floor(content.length / 2);
      return {
        slide1: content.substring(0, midpoint).replace(/Slide\s+1:|First\s+Slide:/i, '').trim(),
        slide2: content.substring(midpoint).trim()
      };
    }
    
    return {
      slide1: slides[0].replace(/Slide\s+1:|First\s+Slide:/i, '').trim(),
      slide2: slides[1].trim()
    };
  } catch (error) {
    console.error('Error generating theory content:', error);
    throw new Error(`Failed to generate theory content: ${error.message}`);
  }
}

/**
 * Generate quiz content for a segment
 */
async function generateQuizContent(
  lectureContent: string,
  segmentNumber: number,
  segmentTitle: string,
  segmentDescription: string,
  contentLanguage: string = 'english'
): Promise<{
  quiz1Type: string;
  quiz1Question: string;
  quiz1Options: string[];
  quiz1CorrectAnswer: string;
  quiz1Explanation: string;
  quiz2Type: string;
  quiz2Question: string;
  quiz2CorrectAnswer: boolean;
  quiz2Explanation: string;
}> {
  console.log(`Generating quiz content for segment ${segmentNumber}: ${segmentTitle}`);
  
  const openai_key = Deno.env.get('OPENAI_API_KEY');
  if (!openai_key) {
    throw new Error('OpenAI API key not found in environment variables');
  }
  
  // Format the instruction for AI to generate quiz content
  const instruction = `
    Create two quiz questions based on this lecture segment titled "${segmentTitle}" 
    with the following description: "${segmentDescription}".
    
    Use this lecture content as reference: "${lectureContent.substring(0, 4000)}..."
    
    In ${contentLanguage} language, create:
    
    1. A multiple-choice question with 4 options where only one is correct.
    2. A true/false question.
    
    For each question, provide:
    - The question text
    - For multiple choice: the options (labeled A, B, C, D)
    - The correct answer
    - A brief explanation of why the answer is correct
    
    Format your response as structured data that can be easily parsed.
  `;
  
  try {
    // API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openai_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert quiz creator. Create clear, challenging but fair quiz questions to test student understanding.'
          },
          { role: 'user', content: instruction }
        ],
        temperature: 0.5
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Process the response to extract structured quiz data
    // This is a simplified parser and might need to be improved based on actual AI responses
    const multipleChoiceMatch = content.match(/multiple[ -]choice[^:]*:?\s*(.+?)(?=true[ -]false|$)/is);
    const trueFalseMatch = content.match(/true[ -]false[^:]*:?\s*(.+)/is);
    
    if (!multipleChoiceMatch || !trueFalseMatch) {
      console.error('Failed to parse quiz content correctly');
      throw new Error('Could not parse quiz content from AI response');
    }
    
    const mcContent = multipleChoiceMatch[1];
    const tfContent = trueFalseMatch[1];
    
    // Parse multiple choice question
    const mcQuestionMatch = mcContent.match(/(?:question|q)(?:\s*\d*)?[^:]*:?\s*([^\n]+)/i);
    const mcOptionsMatch = mcContent.match(/(?:options|choices)[^:]*:?\s*((?:.+\n?)+?)(?=correct|answer)/i);
    const mcCorrectMatch = mcContent.match(/(?:correct|answer)[^:]*:?\s*([^\n]+)/i);
    const mcExplanationMatch = mcContent.match(/(?:explanation|reason)[^:]*:?\s*([^\n]+(?:\n[^\n]+)*)/i);
    
    // Parse true/false question
    const tfQuestionMatch = tfContent.match(/(?:question|q)(?:\s*\d*)?[^:]*:?\s*([^\n]+)/i);
    const tfCorrectMatch = tfContent.match(/(?:correct|answer)[^:]*:?\s*([^\n]+)/i);
    const tfExplanationMatch = tfContent.match(/(?:explanation|reason)[^:]*:?\s*([^\n]+(?:\n[^\n]+)*)/i);
    
    if (!mcQuestionMatch || !mcOptionsMatch || !mcCorrectMatch || !mcExplanationMatch ||
        !tfQuestionMatch || !tfCorrectMatch || !tfExplanationMatch) {
      console.error('Failed to parse quiz components');
      throw new Error('Could not extract all required quiz components');
    }
    
    // Process multiple choice options
    const optionsText = mcOptionsMatch[1];
    const optionsArray = optionsText.split(/\n/).filter(line => line.trim())
      .map(option => option.replace(/^[A-D][\s.)-]+/, '').trim());
    
    // Determine correct answer for multiple choice
    const correctAnswer = mcCorrectMatch[1].trim();
    // Handle different formats of correct answer (letter, full text, etc.)
    let processedCorrectAnswer = correctAnswer;
    if (correctAnswer.match(/^[A-D]$/i)) {
      const index = correctAnswer.toUpperCase().charCodeAt(0) - 65; // Convert A->0, B->1, etc.
      if (index >= 0 && index < optionsArray.length) {
        processedCorrectAnswer = optionsArray[index];
      }
    }
    
    // Process true/false answer
    const tfAnswerText = tfCorrectMatch[1].toLowerCase().trim();
    const tfAnswer = tfAnswerText.includes('true');
    
    return {
      quiz1Type: 'multiple_choice',
      quiz1Question: mcQuestionMatch[1].trim(),
      quiz1Options: optionsArray,
      quiz1CorrectAnswer: processedCorrectAnswer,
      quiz1Explanation: mcExplanationMatch[1].trim(),
      quiz2Type: 'true_false',
      quiz2Question: tfQuestionMatch[1].trim(),
      quiz2CorrectAnswer: tfAnswer,
      quiz2Explanation: tfExplanationMatch[1].trim()
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

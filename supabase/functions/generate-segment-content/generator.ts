
import { validateSegmentContent } from './validator.ts';
import { SegmentContent, SegmentInput } from './types.ts';

// Define the OpenAI API key
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

// Define Supabase URL and key
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

export async function generateSegmentContent(input: SegmentInput): Promise<SegmentContent> {
  try {
    // Extract input parameters and log them for debugging
    const { content, title, description, language = 'en' } = input;
    
    console.log('Generator received input:', {
      title: title,
      description: description,
      contentLength: content ? content.length : 0,
      language: language
    });

    // Generate theory slides
    const theorySlides = await generateTheoryContent(content, title, description, language);
    
    // Generate quiz questions
    const quizContent = await generateQuizContent(content, title, description, language);

    // Combine the results
    const segmentContent: SegmentContent = {
      ...theorySlides,
      ...quizContent
    };

    // Validate the content
    const validationResult = validateSegmentContent(segmentContent);
    
    if (!validationResult.valid) {
      console.error('Validation errors:', validationResult.errors);
      throw new Error(`Content validation failed: ${validationResult.errors.join(', ')}`);
    }

    return segmentContent;
  } catch (error) {
    console.error('Error in generateSegmentContent:', error);
    throw error;
  }
}

async function generateTheoryContent(
  content: string,
  title: string,
  description: string,
  language: string
): Promise<Partial<SegmentContent>> {
  try {
    // Add null check for content and provide a default empty string if undefined
    const safeContent = content || '';
    
    // Add null checks for title and description
    const safeTitle = title || 'No title provided';
    const safeDescription = description || 'No description provided';
    
    console.log('Theory content generation parameters:', {
      titleLength: safeTitle.length,
      title: safeTitle,
      descriptionLength: safeDescription.length,
      description: safeDescription,
      contentLength: safeContent.length,
      language: language
    });

    const prompt = `
    You are an educational content creator. Create two theory slides about the following topic:
    
    Topic: ${safeTitle}
    Description: ${safeDescription}
    
    Reference content:
    ${safeContent.substring(0, Math.min(safeContent.length, 8000))}
    
    Instructions:
    1. Create two concise theory slides in ${language} language.
    2. Each slide should be around 200-300 words.
    3. Use clear, educational language.
    4. Format your response exactly like this:
    
    THEORY_SLIDE_1: [content of the first slide]
    
    THEORY_SLIDE_2: [content of the second slide]
    `;

    console.log('Sending theory content prompt to OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an educational content creator specializing in creating concise, informative theory slides.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    
    console.log('Theory content generated:', generatedText);

    // Parse the response to extract the theory slides
    const slide1Match = generatedText.match(/THEORY_SLIDE_1:\s*([\s\S]*?)(?=\s*\n\s*THEORY_SLIDE_2:|$)/);
    const slide2Match = generatedText.match(/THEORY_SLIDE_2:\s*([\s\S]*?)(?=$)/);

    if (!slide1Match || !slide2Match) {
      console.error('Failed to parse theory content correctly from:', generatedText);
      throw new Error('Failed to parse theory content correctly');
    }

    const theorySlide1 = slide1Match[1].trim();
    const theorySlide2 = slide2Match[1].trim();

    return {
      theory_slide_1: theorySlide1,
      theory_slide_2: theorySlide2,
    };
  } catch (error) {
    console.error('Error in generateTheoryContent:', error);
    throw error;
  }
}

async function generateQuizContent(
  content: string,
  title: string,
  description: string,
  language: string
): Promise<Partial<SegmentContent>> {
  try {
    // Add null check for content and provide a default empty string if undefined
    const safeContent = content || '';
    
    // Add null checks for title and description
    const safeTitle = title || 'No title provided';
    const safeDescription = description || 'No description provided';
    
    console.log('Quiz content generation parameters:', {
      titleLength: safeTitle.length,
      title: safeTitle,
      descriptionLength: safeDescription.length,
      description: safeDescription,
      contentLength: safeContent.length,
      language: language
    });
    
    const prompt = `
    You are an educational quiz creator. Create two quiz questions about the following topic:
    
    Topic: ${safeTitle}
    Description: ${safeDescription}
    
    Reference content:
    ${safeContent.substring(0, Math.min(safeContent.length, 8000))}
    
    Instructions:
    1. Create one multiple-choice question with 4 options and one true/false question in ${language} language.
    2. Format your response EXACTLY as follows - this is crucial:
    
    QUIZ_1_TYPE: multiple_choice
    QUIZ_1_QUESTION: [your question here]
    QUIZ_1_OPTIONS: ["option 1", "option 2", "option 3", "option 4"]
    QUIZ_1_CORRECT_ANSWER: [exact text of the correct option]
    QUIZ_1_EXPLANATION: [explanation of the correct answer]
    
    QUIZ_2_TYPE: true_false
    QUIZ_2_QUESTION: [your question here]
    QUIZ_2_CORRECT_ANSWER: [true or false]
    QUIZ_2_EXPLANATION: [explanation of the correct answer]
    `;

    console.log('Sending quiz content prompt to OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an educational quiz creator specializing in creating engaging, informative quiz questions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    
    console.log('Quiz content generated:', generatedText);

    // Improved regex patterns to match the format more precisely
    const typeMatch1 = generatedText.match(/QUIZ_1_TYPE:\s*(multiple_choice|true_false)/i);
    const questionMatch1 = generatedText.match(/QUIZ_1_QUESTION:\s*(.*?)(?=\s*\n)/s);
    const optionsMatch1 = generatedText.match(/QUIZ_1_OPTIONS:\s*(\[.*?\])/s);
    const correctAnswerMatch1 = generatedText.match(/QUIZ_1_CORRECT_ANSWER:\s*(.*?)(?=\s*\n)/s);
    const explanationMatch1 = generatedText.match(/QUIZ_1_EXPLANATION:\s*(.*?)(?=\s*\n\s*QUIZ_2|$)/s);

    const typeMatch2 = generatedText.match(/QUIZ_2_TYPE:\s*(multiple_choice|true_false)/i);
    const questionMatch2 = generatedText.match(/QUIZ_2_QUESTION:\s*(.*?)(?=\s*\n)/s);
    const correctAnswerMatch2 = generatedText.match(/QUIZ_2_CORRECT_ANSWER:\s*(.*?)(?=\s*\n)/s);
    const explanationMatch2 = generatedText.match(/QUIZ_2_EXPLANATION:\s*(.*?)(?=$)/s);

    // Add better validation and error handling
    if (!typeMatch1 || !questionMatch1 || !correctAnswerMatch1 || !explanationMatch1 ||
        !typeMatch2 || !questionMatch2 || !correctAnswerMatch2 || !explanationMatch2) {
      console.error('Missing quiz content components in generated text:', generatedText);
      console.error('Matches:', {
        typeMatch1, questionMatch1, optionsMatch1, correctAnswerMatch1, explanationMatch1,
        typeMatch2, questionMatch2, correctAnswerMatch2, explanationMatch2
      });
      throw new Error('Failed to parse quiz content correctly');
    }

    // Extract values from matches
    const quiz1Type = typeMatch1[1].trim();
    const quiz1Question = questionMatch1[1].trim();
    let quiz1Options: string[] = [];
    
    // Parse the options - this is a common source of errors
    if (quiz1Type === 'multiple_choice') {
      if (!optionsMatch1) {
        throw new Error('Options missing for multiple-choice question');
      }
      
      try {
        // Use a safer JSON parsing approach
        const optionsString = optionsMatch1[1].trim().replace(/'/g, '"');
        quiz1Options = JSON.parse(optionsString);
        
        if (!Array.isArray(quiz1Options) || quiz1Options.length !== 4) {
          throw new Error(`Invalid options format: ${optionsString}`);
        }
      } catch (error) {
        console.error('Error parsing quiz options:', error, 'Options string:', optionsMatch1[1]);
        throw new Error('Failed to parse quiz options correctly');
      }
    }
    
    const quiz1CorrectAnswer = correctAnswerMatch1[1].trim();
    const quiz1Explanation = explanationMatch1[1].trim();

    const quiz2Type = typeMatch2[1].trim();
    const quiz2Question = questionMatch2[1].trim();
    // Parse the true/false value correctly
    const quiz2CorrectAnswerString = correctAnswerMatch2[1].trim().toLowerCase();
    const quiz2CorrectAnswer = quiz2CorrectAnswerString === 'true';
    const quiz2Explanation = explanationMatch2[1].trim();

    return {
      quiz_1_type: quiz1Type,
      quiz_1_question: quiz1Question,
      quiz_1_options: quiz1Options,
      quiz_1_correct_answer: quiz1CorrectAnswer,
      quiz_1_explanation: quiz1Explanation,
      quiz_2_type: quiz2Type,
      quiz_2_question: quiz2Question,
      quiz_2_correct_answer: quiz2CorrectAnswer,
      quiz_2_explanation: quiz2Explanation,
    };
  } catch (error) {
    console.error('Error in generateQuizContent:', error);
    throw error;
  }
}

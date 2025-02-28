
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.4.0';
import { SegmentContent } from './types.ts';

// Create a Supabase client with the service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Initialize the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

export const generateContent = async (
  lectureContent: string,
  segmentTitle: string,
  segmentDescription: string,
  contentLanguage: string = 'english'
): Promise<SegmentContent> => {
  try {
    console.log(`Generating content for segment: ${segmentTitle}`);
    
    // Generate theory content first
    const theoryContent = await generateTheoryContent(
      lectureContent,
      segmentTitle,
      segmentDescription,
      contentLanguage
    );
    
    console.log('Theory content generated successfully');
    
    // Then generate quiz content
    const quizContent = await generateQuizContent(
      lectureContent,
      segmentTitle,
      segmentDescription,
      contentLanguage
    );
    
    console.log('Quiz content generated successfully');
    
    // Combine theory and quiz content
    return {
      ...theoryContent,
      ...quizContent
    };
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
};

// Function to generate theory content
async function generateTheoryContent(
  lectureContent: string,
  segmentTitle: string,
  segmentDescription: string,
  contentLanguage: string
): Promise<Partial<SegmentContent>> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }

  try {
    const prompt = `
Create two comprehensive theory slides about "${segmentTitle}". The content should be based on this lecture segment description: "${segmentDescription}" and should reflect the following lecture content: "${lectureContent.substring(0, 2000)}..."

Create your response in ${contentLanguage}.

Format your response as:
THEORY_SLIDE_1: [Detailed content for the first slide, focusing on introducing the topic]
THEORY_SLIDE_2: [Detailed content for the second slide, focusing on deeper aspects]

Be concise but comprehensive, aim for around 150-200 words per slide. Use markdown formatting for headers and bullet points.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert educator creating learning materials.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }
    
    const generatedText = data.choices[0].message.content;
    
    // Parse theory content
    const slide1Match = generatedText.match(/THEORY_SLIDE_1:(.*?)(?=THEORY_SLIDE_2:|$)/s);
    const slide2Match = generatedText.match(/THEORY_SLIDE_2:(.*?)(?=$)/s);
    
    if (!slide1Match || !slide2Match) {
      throw new Error('Failed to parse theory content');
    }
    
    return {
      theory_slide_1: slide1Match[1].trim(),
      theory_slide_2: slide2Match[1].trim()
    };
  } catch (error) {
    console.error('Error generating theory content:', error);
    throw error;
  }
}

// Function to generate quiz content
async function generateQuizContent(
  lectureContent: string,
  segmentTitle: string,
  segmentDescription: string,
  contentLanguage: string
): Promise<Partial<SegmentContent>> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }

  try {
    const prompt = `
Create two quiz questions about "${segmentTitle}" based on this lecture segment description: "${segmentDescription}" and using this lecture content: "${lectureContent.substring(0, 2000)}..."

Create your response in ${contentLanguage}.

The first quiz should be a multiple-choice question with 4 options.
The second quiz should be a true/false question.

Format your response EXACTLY as follows:
QUIZ_1_TYPE: multiple_choice
QUIZ_1_QUESTION: [Clear, concise question]
QUIZ_1_OPTIONS: ["Option 1", "Option 2", "Option 3", "Option 4"]
QUIZ_1_CORRECT_ANSWER: [One of the exact options from above]
QUIZ_1_EXPLANATION: [Brief explanation of why the answer is correct]

QUIZ_2_TYPE: true_false
QUIZ_2_QUESTION: [Clear statement that is either true or false]
QUIZ_2_CORRECT_ANSWER: [true or false - lowercase]
QUIZ_2_EXPLANATION: [Brief explanation of why the statement is true or false]
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert educator creating assessment materials.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }
    
    const generatedText = data.choices[0].message.content;
    console.log("Generated quiz text:", generatedText);
    
    // Improved regex patterns for parsing quiz content
    const quiz1TypeMatch = generatedText.match(/QUIZ_1_TYPE:\s*(.*?)(?=\n|$)/);
    const quiz1QuestionMatch = generatedText.match(/QUIZ_1_QUESTION:\s*(.*?)(?=\n|$)/);
    const quiz1OptionsMatch = generatedText.match(/QUIZ_1_OPTIONS:\s*(\[.*?\])(?=\n|$)/);
    const quiz1CorrectAnswerMatch = generatedText.match(/QUIZ_1_CORRECT_ANSWER:\s*(.*?)(?=\n|$)/);
    const quiz1ExplanationMatch = generatedText.match(/QUIZ_1_EXPLANATION:\s*(.*?)(?=\n|QUIZ_2|$)/s);
    
    const quiz2TypeMatch = generatedText.match(/QUIZ_2_TYPE:\s*(.*?)(?=\n|$)/);
    const quiz2QuestionMatch = generatedText.match(/QUIZ_2_QUESTION:\s*(.*?)(?=\n|$)/);
    const quiz2CorrectAnswerMatch = generatedText.match(/QUIZ_2_CORRECT_ANSWER:\s*(.*?)(?=\n|$)/);
    const quiz2ExplanationMatch = generatedText.match(/QUIZ_2_EXPLANATION:\s*(.*?)(?=$)/s);
    
    if (!quiz1TypeMatch || !quiz1QuestionMatch || !quiz1OptionsMatch || 
        !quiz1CorrectAnswerMatch || !quiz1ExplanationMatch || !quiz2TypeMatch || 
        !quiz2QuestionMatch || !quiz2CorrectAnswerMatch || !quiz2ExplanationMatch) {
      console.error('Quiz parsing failed', {
        quiz1TypeMatch,
        quiz1QuestionMatch,
        quiz1OptionsMatch,
        quiz1CorrectAnswerMatch,
        quiz1ExplanationMatch,
        quiz2TypeMatch,
        quiz2QuestionMatch,
        quiz2CorrectAnswerMatch,
        quiz2ExplanationMatch
      });
      throw new Error('Failed to parse quiz content');
    }
    
    // For Quiz 1 options, parse the JSON array
    let quiz1Options: string[] = [];
    try {
      // Clean the options string and parse it
      const optionsString = quiz1OptionsMatch[1].trim();
      quiz1Options = JSON.parse(optionsString);
    } catch (error) {
      console.error('Error parsing quiz options:', error);
      console.log('Raw options string:', quiz1OptionsMatch[1]);
      // Fallback to a simpler parsing method if JSON.parse fails
      const optionsText = quiz1OptionsMatch[1].replace(/^\[|\]$/g, '');
      quiz1Options = optionsText.split(',').map(option => 
        option.trim().replace(/^"|"$/g, '')
      );
    }
    
    // For Quiz 2, parse boolean value properly
    let quiz2CorrectAnswer: boolean;
    const quiz2AnswerText = quiz2CorrectAnswerMatch[1].trim().toLowerCase();
    quiz2CorrectAnswer = quiz2AnswerText === 'true';
    
    return {
      quiz_1_type: quiz1TypeMatch[1].trim(),
      quiz_1_question: quiz1QuestionMatch[1].trim(),
      quiz_1_options: quiz1Options,
      quiz_1_correct_answer: quiz1CorrectAnswerMatch[1].trim(),
      quiz_1_explanation: quiz1ExplanationMatch[1].trim(),
      quiz_2_type: quiz2TypeMatch[1].trim(),
      quiz_2_question: quiz2QuestionMatch[1].trim(),
      quiz_2_correct_answer: quiz2CorrectAnswer,
      quiz_2_explanation: quiz2ExplanationMatch[1].trim()
    };
  } catch (error) {
    console.error('Error generating quiz content:', error);
    throw error;
  }
}

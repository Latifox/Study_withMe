import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const openAIApiKey = Deno.env.get('OPENAI_API_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface GenerateContentResult {
  success: boolean;
  content?: any;
  error?: string;
}

export async function generateSegmentContent(
  lectureId: number,
  segmentNumber: number,
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  contentLanguage: string
): Promise<GenerateContentResult> {
  try {
    console.log(`Generating content for segment ${segmentNumber}: "${segmentTitle}"`);
    
    // Generate theory slides content
    const theoryResult = await generateTheoryContent(
      segmentTitle,
      segmentDescription,
      lectureContent,
      contentLanguage
    );
    
    if (!theoryResult.success) {
      return { success: false, error: theoryResult.error };
    }
    
    // Generate quiz content
    const quizResult = await generateQuizContent(
      segmentTitle,
      segmentDescription,
      lectureContent,
      contentLanguage
    );
    
    if (!quizResult.success) {
      return { success: false, error: quizResult.error };
    }
    
    // Combine theory and quiz content
    const combinedContent = {
      theory_slide_1: theoryResult.content.slide1,
      theory_slide_2: theoryResult.content.slide2,
      quiz_1_type: quizResult.content.quiz1.type,
      quiz_1_question: quizResult.content.quiz1.question,
      quiz_1_options: quizResult.content.quiz1.options,
      quiz_1_correct_answer: quizResult.content.quiz1.correctAnswer,
      quiz_1_explanation: quizResult.content.quiz1.explanation,
      quiz_2_type: quizResult.content.quiz2.type,
      quiz_2_question: quizResult.content.quiz2.question,
      quiz_2_correct_answer: quizResult.content.quiz2.correctAnswer,
      quiz_2_explanation: quizResult.content.quiz2.explanation
    };
    
    console.log("Successfully generated theory and quiz content");
    
    return {
      success: true,
      content: combinedContent
    };
  } catch (error) {
    console.error("Error in generateSegmentContent:", error);
    return {
      success: false,
      error: `Content generation failed: ${error.message || error}`
    };
  }
}

async function generateTheoryContent(
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  contentLanguage: string
): Promise<GenerateContentResult> {
  try {
    const maxContentLength = 1500;
    const truncatedContent = lectureContent.length > maxContentLength 
      ? lectureContent.substring(0, maxContentLength) + "..." 
      : lectureContent;
    
    const prompt = `
    Create educational content for a segment titled "${segmentTitle}" with the description: "${segmentDescription}".
    
    Use this lecture content as reference: "${truncatedContent}"
    
    Generate two theory slides in ${contentLanguage}. Each slide should have:
    1. Clear, concise explanations
    2. Well-structured content using proper Markdown formatting
    3. Use bullet points, numbering, bold/italic emphasis where appropriate
    4. Include 2-3 key points per slide
    5. Make it engaging and educational
    
    Format your response as follows:
    
    SLIDE 1:
    [First slide content with proper Markdown formatting]
    
    SLIDE 2:
    [Second slide content with proper Markdown formatting]
    `;
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an educational content creator specialized in creating engaging theory slides with proper Markdown formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    
    // Extract slides from the generated text
    const slidePattern = /SLIDE 1:([\s\S]*?)(?=SLIDE 2:|$)SLIDE 2:([\s\S]*?)(?=$)/;
    const matches = generatedText.match(slidePattern);
    
    if (!matches || matches.length < 3) {
      throw new Error("Failed to parse theory slides content correctly");
    }
    
    const slide1 = matches[1].trim();
    const slide2 = matches[2].trim();
    
    return {
      success: true,
      content: {
        slide1,
        slide2
      }
    };
  } catch (error) {
    console.error("Error in generateTheoryContent:", error);
    return {
      success: false,
      error: `Theory content generation failed: ${error.message || error}`
    };
  }
}

async function generateQuizContent(
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  contentLanguage: string
): Promise<GenerateContentResult> {
  try {
    const maxContentLength = 1500;
    const truncatedContent = lectureContent.length > maxContentLength 
      ? lectureContent.substring(0, maxContentLength) + "..." 
      : lectureContent;
    
    const prompt = `
    Create two quiz questions for a segment titled "${segmentTitle}" with the description: "${segmentDescription}".
    
    Use this lecture content as reference: "${truncatedContent}"
    
    Question 1 should be multiple choice with 4 options.
    Question 2 should be true/false.
    
    All content should be in ${contentLanguage} language.
    
    Format your response EXACTLY as follows with clear separation between sections:
    
    QUIZ_1_TYPE: multiple_choice
    QUIZ_1_QUESTION: [Write the question]
    QUIZ_1_OPTIONS: ["Option 1", "Option 2", "Option 3", "Option 4"]
    QUIZ_1_CORRECT_ANSWER: [Exact text of the correct answer option]
    QUIZ_1_EXPLANATION: [Explanation why this is the correct answer]
    
    QUIZ_2_TYPE: true_false
    QUIZ_2_QUESTION: [Write the true/false question]
    QUIZ_2_CORRECT_ANSWER: [true or false - lowercase]
    QUIZ_2_EXPLANATION: [Explanation why this is the correct answer]
    `;
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an educational quiz creator specialized in creating assessment questions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    
    // Improved extraction of quiz data with better regex patterns
    // Quiz 1 extraction
    const quiz1TypeMatch = generatedText.match(/QUIZ_1_TYPE:\s*(.*?)(?=\n|$)/);
    const quiz1QuestionMatch = generatedText.match(/QUIZ_1_QUESTION:\s*(.*?)(?=\n|$)/);
    const quiz1OptionsMatch = generatedText.match(/QUIZ_1_OPTIONS:\s*(\[.*?\])(?=\n|$)/);
    const quiz1CorrectAnswerMatch = generatedText.match(/QUIZ_1_CORRECT_ANSWER:\s*(.*?)(?=\n|$)/);
    const quiz1ExplanationMatch = generatedText.match(/QUIZ_1_EXPLANATION:\s*(.*?)(?=\n|QUIZ_2|$)/s);
    
    // Quiz 2 extraction
    const quiz2TypeMatch = generatedText.match(/QUIZ_2_TYPE:\s*(.*?)(?=\n|$)/);
    const quiz2QuestionMatch = generatedText.match(/QUIZ_2_QUESTION:\s*(.*?)(?=\n|$)/);
    const quiz2CorrectAnswerMatch = generatedText.match(/QUIZ_2_CORRECT_ANSWER:\s*(.*?)(?=\n|$)/);
    const quiz2ExplanationMatch = generatedText.match(/QUIZ_2_EXPLANATION:\s*(.*?)(?=$)/s);
    
    if (!quiz1TypeMatch || !quiz1QuestionMatch || !quiz1OptionsMatch || !quiz1CorrectAnswerMatch || !quiz1ExplanationMatch ||
        !quiz2TypeMatch || !quiz2QuestionMatch || !quiz2CorrectAnswerMatch || !quiz2ExplanationMatch) {
      console.error("Failed to parse quiz content, generated text:", generatedText);
      throw new Error("Failed to parse quiz content correctly");
    }
    
    let quiz1Options;
    try {
      // Handle various formats of options that might be returned
      const optionsText = quiz1OptionsMatch[1].trim();
      if (optionsText.startsWith('[') && optionsText.endsWith(']')) {
        // Try to parse as JSON array
        quiz1Options = JSON.parse(optionsText);
      } else {
        // Fall back to splitting by commas and cleaning up
        quiz1Options = optionsText.split(',').map(opt => opt.trim());
      }
    } catch (error) {
      console.error("Error parsing quiz options:", error);
      // Fallback if JSON parsing fails
      quiz1Options = quiz1OptionsMatch[1].replace(/[\[\]"']/g, '').split(',').map(opt => opt.trim());
    }
    
    // Create formatted quiz objects
    const quiz1 = {
      type: quiz1TypeMatch[1].trim(),
      question: quiz1QuestionMatch[1].trim(),
      options: quiz1Options,
      correctAnswer: quiz1CorrectAnswerMatch[1].trim(),
      explanation: quiz1ExplanationMatch[1].trim()
    };
    
    // For quiz 2, convert string 'true'/'false' to actual boolean
    let quiz2CorrectAnswer;
    const answerText = quiz2CorrectAnswerMatch[1].trim().toLowerCase();
    // Keep as string for compatibility with the UI component
    quiz2CorrectAnswer = answerText === 'true';
    
    const quiz2 = {
      type: quiz2TypeMatch[1].trim(),
      question: quiz2QuestionMatch[1].trim(),
      correctAnswer: quiz2CorrectAnswer,
      explanation: quiz2ExplanationMatch[1].trim()
    };
    
    return {
      success: true,
      content: {
        quiz1,
        quiz2
      }
    };
  } catch (error) {
    console.error("Error in generateQuizContent:", error);
    return {
      success: false,
      error: `Quiz content generation failed: ${error.message || error}`
    };
  }
}

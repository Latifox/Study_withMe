
import { Database } from './types';
import { OpenAI } from "openai";

export async function generateSegmentContent(
  openai: OpenAI,
  lectureId: number,
  segmentNumber: number,
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  aiConfig?: Database['public']['Tables']['lecture_ai_configs']['Row'] | null
) {
  // Get AI configuration settings or use defaults
  const temperature = aiConfig?.temperature ?? 0.7;
  const creativityLevel = aiConfig?.creativity_level ?? 0.5;
  const detailLevel = aiConfig?.detail_level ?? 0.6;
  const contentLanguage = aiConfig?.content_language;
  const customInstructions = aiConfig?.custom_instructions;

  // Enhanced system prompt for better content generation
  const systemPrompt = `You are an expert educational content creator.
Generate detailed educational content following these guidelines:

Content Requirements:
- Write between 150-350 words per theory slide
- Use clear, concise language while maintaining depth
- Focus on factual content without citing external sources
- Adapt detail level based on the provided configuration (current: ${detailLevel})
${contentLanguage ? `- Write content in ${contentLanguage}` : ''}

Formatting Requirements:
- Use Markdown formatting extensively
- Utilize bullet points and numbered lists for clear organization
- Use **bold text** for important concepts and key terms
- Create clear section headings with ## and ### 
- Use tables where appropriate (using markdown syntax)
- Break content into logical paragraphs
- Add emphasis using *italic text* for supplementary information

${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}`;

  // Enhanced prompt for theory slides
  const theoryPrompt = `Create two comprehensive theory slides about "${segmentTitle}".
Focus on: ${segmentDescription}

Source content context: ${lectureContent}

Create well-structured content with proper markdown formatting, ensuring each slide:
1. Has a clear introduction
2. Uses bullet points and lists effectively
3. Highlights key concepts in **bold**
4. Includes practical examples where relevant
5. Maintains flow between paragraphs

Do not include phrases like "In this slide" or references to other materials.`;

  // Enhanced prompt for quiz questions
  const quizPrompt = `Based on the theory content for "${segmentTitle}", create two quiz questions:

1. A multiple-choice question that tests understanding of key concepts
2. A true/false question that challenges application of knowledge

Each question must include:
- Clear question text
- For multiple choice: 4 plausible options
- Correct answer
- Detailed explanation of why the answer is correct`;

  try {
    console.log('Generating content with temperature:', temperature);
    console.log('Creativity level:', creativityLevel);
    console.log('Detail level:', detailLevel);

    // Generate theory slides
    const theoryResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: theoryPrompt }
      ],
      temperature: temperature,
    });

    // Generate quiz content
    const quizResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: quizPrompt }
      ],
      temperature: temperature * 0.8, // Slightly lower temperature for quiz generation
    });

    // Process theory slides (split the content into two slides)
    const theoryContent = theoryResponse.choices[0].message.content;
    const slides = theoryContent.split(/(?=##\s*Slide\s*2)|(?=##\s*Part\s*2)/i);
    const [slide1, slide2] = slides.length === 2 ? slides : [theoryContent, ""];

    // Process quiz content
    const quizContent = quizResponse.choices[0].message.content;
    const quizParts = quizContent.split(/(?=Question 2:)|(?=2\.)/);
    
    // Extract multiple choice question
    const mcQuestion = parseMultipleChoiceQuestion(quizParts[0]);
    
    // Extract true/false question
    const tfQuestion = parseTrueFalseQuestion(quizParts[1]);

    return {
      theory_slide_1: slide1.trim(),
      theory_slide_2: slide2.trim(),
      quiz_1_type: "multiple_choice",
      quiz_1_question: mcQuestion.question,
      quiz_1_options: mcQuestion.options,
      quiz_1_correct_answer: mcQuestion.correctAnswer,
      quiz_1_explanation: mcQuestion.explanation,
      quiz_2_type: "true_false",
      quiz_2_question: tfQuestion.question,
      quiz_2_correct_answer: tfQuestion.correctAnswer,
      quiz_2_explanation: tfQuestion.explanation,
    };
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

function parseMultipleChoiceQuestion(content: string) {
  // Default structure if parsing fails
  const defaultQuestion = {
    question: "Question needs to be regenerated",
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctAnswer: "Option A",
    explanation: "Please try regenerating the content",
  };

  try {
    // Extract question text
    const questionMatch = content.match(/(?:Question:|1\.|Multiple choice:)\s*(.+?)(?=\s*(?:Options:|A\)|A\.))/is);
    const question = questionMatch ? questionMatch[1].trim() : defaultQuestion.question;

    // Extract options
    const optionsMatch = content.match(/(?:A[\).]\s*(.+?)\s*(?=B[\).])|B[\).]\s*(.+?)\s*(?=C[\).])|C[\).]\s*(.+?)\s*(?=D[\).])|D[\).]\s*(.+?))\s*(?=Correct|Answer|$)/gis);
    const options = optionsMatch 
      ? optionsMatch.map(opt => opt.replace(/^[A-D][\).]/, '').trim())
      : defaultQuestion.options;

    // Extract correct answer and explanation
    const answerMatch = content.match(/(?:Correct Answer:|Answer:)\s*([A-D])/i);
    const correctAnswer = answerMatch 
      ? options[answerMatch[1].charCodeAt(0) - 65]
      : defaultQuestion.correctAnswer;

    const explanationMatch = content.match(/(?:Explanation:|Reasoning:)\s*(.+?)(?=\s*$)/is);
    const explanation = explanationMatch 
      ? explanationMatch[1].trim()
      : defaultQuestion.explanation;

    return { question, options, correctAnswer, explanation };
  } catch (error) {
    console.error('Error parsing multiple choice question:', error);
    return defaultQuestion;
  }
}

function parseTrueFalseQuestion(content: string) {
  // Default structure if parsing fails
  const defaultQuestion = {
    question: "Question needs to be regenerated",
    correctAnswer: true,
    explanation: "Please try regenerating the content",
  };

  try {
    // Extract question text
    const questionMatch = content.match(/(?:Question:|2\.|True\/False:)\s*(.+?)(?=\s*(?:Answer:|Correct Answer:|$))/is);
    const question = questionMatch ? questionMatch[1].trim() : defaultQuestion.question;

    // Extract correct answer
    const answerMatch = content.match(/(?:Correct Answer:|Answer:)\s*(true|false)/i);
    const correctAnswer = answerMatch 
      ? answerMatch[1].toLowerCase() === 'true'
      : defaultQuestion.correctAnswer;

    // Extract explanation
    const explanationMatch = content.match(/(?:Explanation:|Reasoning:)\s*(.+?)(?=\s*$)/is);
    const explanation = explanationMatch 
      ? explanationMatch[1].trim()
      : defaultQuestion.explanation;

    return { question, correctAnswer, explanation };
  } catch (error) {
    console.error('Error parsing true/false question:', error);
    return defaultQuestion;
  }
}

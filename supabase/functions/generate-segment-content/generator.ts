
import { ContentLang } from "./types.ts";

export async function generateTheoryContent(
  apiKey: string, 
  segmentTitle: string, 
  segmentDescription: string, 
  lectureContent: string
) {
  console.log(`Generating theory content for: ${segmentTitle}`);
  
  const system_prompt = `You are an expert educational content creator. 
Your task is to create richly formatted content for two theory slides about a specific lecture segment.
IMPORTANT: Format your output using Markdown syntax, including:
- Use ## for headings and ### for subheadings
- Use **bold** for important terms and concepts
- Use *italics* for emphasis
- Use bullet points and numbered lists where appropriate
- Use > for important quotes or callouts
- Include clear paragraph breaks for readability
- Use --- for section dividers if needed

Make the content visually structured and engaging. Ensure it's comprehensive yet concise.`;
  
  const user_prompt = `Create two theory slides about "${segmentTitle}".
  
The segment description is: "${segmentDescription}"

The relevant lecture content is: "${lectureContent.substring(0, 15000)}"

For each slide, provide content that is:
1. Educational and informative
2. Focused on the topic
3. Rich in markdown formatting for visual appeal
4. Well-structured with headings, paragraphs, and lists
5. Clear and engaging for students

Each theory slide should be around 250-400 words, comprehensive but concise.
DO NOT include the title of the slide in the content.
DO NOT include introductory text like "Theory Slide 1" or "Here's the content for the first slide".

ONLY return a JSON object with the following structure:
{
  "theory_slide_1": "Markdown formatted content for the first slide",
  "theory_slide_2": "Markdown formatted content for the second slide"
}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: user_prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("OpenAI API error:", error);
    throw new Error(`OpenAI API error: ${error.error.message}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  
  console.log("Theory content generated successfully");
  return JSON.parse(content);
}

export async function generateQuizContent(
  apiKey: string,
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string
) {
  console.log(`Generating quiz content for: ${segmentTitle}`);
  
  const system_prompt = `You are an expert educational content creator specializing in interactive quizzes.
Your task is to create two quizzes for a specific lecture segment.
The first quiz will be multiple-choice, and the second will be a true/false question.`;

  const user_prompt = `Create two quizzes about "${segmentTitle}".
  
The segment description is: "${segmentDescription}"

The relevant lecture content is: "${lectureContent.substring(0, 15000)}"

Quiz 1 should be a multiple-choice question with 3-4 options, with only one correct answer.
Quiz 2 should be a true/false question.

For each quiz:
1. Make it educational and challenging but fair
2. Base it on important concepts from the content
3. Provide a clear explanation for the correct answer
4. Make the incorrect options plausible

ONLY return a JSON object with the following structure:
{
  "quiz_1_type": "multiple-choice",
  "quiz_1_question": "The question text",
  "quiz_1_options": ["Option A", "Option B", "Option C", "Option D"],
  "quiz_1_correct_answer": "The text of the correct option exactly as it appears in the options array",
  "quiz_1_explanation": "A detailed explanation of why the answer is correct",
  
  "quiz_2_type": "true-false",
  "quiz_2_question": "The question text that can be answered with true or false",
  "quiz_2_correct_answer": true or false (boolean value),
  "quiz_2_explanation": "A detailed explanation of why the answer is true or false"
}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: user_prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("OpenAI API error:", error);
    throw new Error(`OpenAI API error: ${error.error.message}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  
  console.log("Quiz content generated successfully");
  return JSON.parse(content);
}

// This is the main function that the index.ts file is trying to import
export async function generateSegmentContent({ segmentTitle, segmentDescription, lectureContent, contentLanguage = 'english' }) {
  console.log('Starting segment content generation for:', segmentTitle);
  console.log('Content language:', contentLanguage);
  
  // Get OpenAI API key from environment variable
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  try {
    // Generate theory content
    console.log('Generating theory content...');
    const theoryContent = await generateTheoryContent(openAIApiKey, segmentTitle, segmentDescription, lectureContent);
    
    // Generate quiz content
    console.log('Generating quiz content...');
    const quizContent = await generateQuizContent(openAIApiKey, segmentTitle, segmentDescription, lectureContent);
    
    // Combine the results
    console.log('Content generation completed successfully');
    return {
      ...theoryContent,
      ...quizContent
    };
  } catch (error) {
    console.error('Error generating segment content:', error);
    throw error;
  }
}

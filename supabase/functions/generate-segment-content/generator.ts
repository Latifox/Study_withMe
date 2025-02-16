
import { AIConfig } from "./types.ts";

const wordCount = (text: string): number => {
  return text.trim().split(/\s+/).length;
};

const MIN_WORDS = 400;
const MAX_WORDS = 600;

export const generatePrompt = (
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  aiConfig: AIConfig
) => {
  const languageInstruction = aiConfig.content_language 
    ? `Generate ALL content in ${aiConfig.content_language} ONLY. Do not mix languages.` 
    : 'Generate the content in the same language as the lecture content. Do not mix languages.';

  const creativityLevel = aiConfig.creativity_level || 0.5;
  const detailLevel = aiConfig.detail_level || 0.6;

  const styleInstructions = `
Format the content using these guidelines:
1. Use markdown formatting for better readability
2. Each theory slide should be between ${MIN_WORDS}-${MAX_WORDS} words
3. Use LaTeX for mathematical formulas (wrap in $$ for display math or $ for inline)
4. Break content into sections using ## headings
5. Use bullet points and numbered lists where appropriate
6. Add examples and code blocks when relevant
7. Highlight important concepts using **bold** and *italic*
8. Create tables using markdown when presenting structured information

Creativity level ${creativityLevel} means:
${creativityLevel > 0.7 ? '- Use engaging metaphors and analogies\n- Include interactive examples\n- Add real-world applications' :
  creativityLevel > 0.4 ? '- Balance formal concepts with practical examples\n- Use moderate analogies' :
  '- Stay formal and direct\n- Focus on core concepts'}

Detail level ${detailLevel} means:
${detailLevel > 0.7 ? '- Provide comprehensive explanations\n- Include edge cases\n- Add advanced concepts' :
  detailLevel > 0.4 ? '- Balance basic and advanced concepts\n- Cover main scenarios' :
  '- Focus on fundamental concepts\n- Keep explanations concise'}`;

  return `You are an expert educator creating high-quality educational content.
${languageInstruction}

Custom Instructions: ${aiConfig.custom_instructions || 'Focus on clarity and engagement'}

Content Type: ${segmentTitle}
Description: ${segmentDescription}

Source Material: ${lectureContent}

${styleInstructions}

Return the output in this exact JSON format (no markdown block markers around the JSON itself):
{
  "theory_slide_1": "First slide content with main concepts (${MIN_WORDS}-${MAX_WORDS} words)",
  "theory_slide_2": "Second slide content with examples and applications (${MIN_WORDS}-${MAX_WORDS} words)",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "Clear, thought-provoking question",
  "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "quiz_1_correct_answer": "Correct option (must match exactly one of the options)",
  "quiz_1_explanation": "Detailed explanation of why this answer is correct",
  "quiz_2_type": "true_false",
  "quiz_2_question": "Clear true/false question",
  "quiz_2_correct_answer": true,
  "quiz_2_explanation": "Detailed explanation of why this is true/false"
}`;
};

export const generateContent = async (prompt: string) => {
  console.log('Generating content with prompt:', prompt);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',  // Using the more powerful model for better content
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert educator that creates engaging, well-structured educational content. Always return valid JSON without any markdown formatting or code blocks around the JSON itself. The content inside the JSON should use markdown and LaTeX formatting where appropriate.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    console.error('OpenAI API error response:', await response.text());
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Additional safety check to ensure we have valid JSON
  try {
    const parsed = JSON.parse(content);
    console.log('Successfully generated and parsed content');
    return JSON.stringify(parsed);
  } catch (error) {
    console.error('Failed to parse OpenAI response as JSON:', content);
    throw new Error('Invalid JSON response from OpenAI');
  }
};

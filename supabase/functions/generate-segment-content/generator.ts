
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
CRITICAL REQUIREMENTS:
1. Each theory slide MUST contain between ${MIN_WORDS} and ${MAX_WORDS} words. This is MANDATORY.
2. Use a comprehensive structure with multiple sections, examples, and detailed explanations.
3. Include practical applications and real-world examples when relevant.

Format the content using these guidelines:
1. Break down complex topics into digestible sections using ## headers
2. Use **bold** for key terms and *italic* for emphasis
3. Create lists for step-by-step explanations:
   - Use bullet points for related items
   - Use numbered lists for sequences
4. Use LaTeX for all mathematical formulas:
   - Inline formulas with single $ (e.g., $E=mc^2$)
   - Display formulas with double $$ (e.g., $$\\frac{dx}{dt}$$)
5. Use markdown tables for comparing concepts
6. Include code blocks with proper syntax highlighting if relevant
7. Add block quotes for important definitions or key points

Each theory slide should follow this structure:
1. Introduction (50-75 words)
2. Main Concepts (200-250 words)
3. Examples and Applications (100-150 words)
4. Practical Implications (50-75 words)
5. Summary or Key Takeaways (50 words)

Creativity level ${creativityLevel} settings:
${creativityLevel > 0.7 ? 
  '- Use engaging metaphors and analogies\n- Include interactive examples\n- Add compelling real-world applications\n- Use storytelling elements\n- Incorporate relevant case studies' :
  creativityLevel > 0.4 ? 
  '- Balance formal concepts with practical examples\n- Use moderate analogies\n- Include industry applications\n- Add relevant examples' :
  '- Stay formal and direct\n- Focus on core concepts\n- Use straightforward examples\n- Maintain academic tone'}

Detail level ${detailLevel} requirements:
${detailLevel > 0.7 ? 
  '- Provide comprehensive explanations\n- Include edge cases and exceptions\n- Add advanced concepts\n- Explain underlying principles\n- Connect to broader context' :
  detailLevel > 0.4 ? 
  '- Balance basic and advanced concepts\n- Cover main scenarios\n- Include moderate detail\n- Explain key mechanisms' :
  '- Focus on fundamental concepts\n- Keep explanations concise\n- Cover essential elements\n- Maintain clarity'}`;

  return `You are an expert educator creating high-quality educational content.
${languageInstruction}

Custom Instructions: ${aiConfig.custom_instructions || 'Focus on clarity and engagement'}

Content Type: ${segmentTitle}
Description: ${segmentDescription}

Source Material: ${lectureContent}

${styleInstructions}

IMPORTANT: Ensure EACH theory slide has between ${MIN_WORDS} and ${MAX_WORDS} words. Content that doesn't meet this requirement will be rejected.

Return a JSON object with no markdown block markers in this exact format:
{
  "theory_slide_1": "Comprehensive slide 1 (${MIN_WORDS}-${MAX_WORDS} words, following structure above)",
  "theory_slide_2": "Comprehensive slide 2 (${MIN_WORDS}-${MAX_WORDS} words, following structure above)",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "Clear, thought-provoking question",
  "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "quiz_1_correct_answer": "Correct option (must match exactly one of the options)",
  "quiz_1_explanation": "Detailed explanation with markdown formatting",
  "quiz_2_type": "true_false",
  "quiz_2_question": "Clear true/false question",
  "quiz_2_correct_answer": true,
  "quiz_2_explanation": "Detailed explanation with markdown formatting"
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
          content: `You are an expert educator creating comprehensive educational content.
Your primary task is to generate detailed theory slides between ${MIN_WORDS} and ${MAX_WORDS} words each.
Use proper markdown formatting and LaTeX where appropriate.
Always return valid JSON without any markdown block markers around it.`
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

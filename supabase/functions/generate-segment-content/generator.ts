
import { AIConfig } from "./types.ts";

export const generatePrompt = (
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  aiConfig: AIConfig
) => {
  const languageInstruction = aiConfig.content_language 
    ? `Generate the content in ${aiConfig.content_language}.` 
    : 'Generate the content in the same language as the lecture content.';

  return `As an expert educator, create educational content for a segment of a lecture.
${languageInstruction}

Lecture Content: ${lectureContent}

For the segment titled "${segmentTitle}" with description "${segmentDescription}", create:

1. Two theory slides that explain the key concepts
2. Two quizzes to test understanding

Custom Instructions: ${aiConfig.custom_instructions}

Adjust output based on these parameters:
- Creativity Level: ${aiConfig.creativity_level} (higher means more creative examples and analogies)
- Detail Level: ${aiConfig.detail_level} (higher means more comprehensive explanations)

Return a JSON object with this exact structure:
{
  "theory_slide_1": "First slide content with main concepts",
  "theory_slide_2": "Second slide content with examples and applications",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "Question text",
  "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "quiz_1_correct_answer": "Correct option",
  "quiz_1_explanation": "Why this is correct",
  "quiz_2_type": "true_false",
  "quiz_2_question": "Question text",
  "quiz_2_correct_answer": true/false,
  "quiz_2_explanation": "Why this is correct"
}`;
};

export const generateContent = async (prompt: string) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert educator that creates engaging educational content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

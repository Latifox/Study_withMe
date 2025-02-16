import { GeneratedContent } from "./types.ts";

export const generatePrompt = (
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  aiConfig: any
) => {
  const basePrompt = `Generate detailed educational content for a segment titled "${segmentTitle}" with the following description: "${segmentDescription}".

Use this lecture content as reference:
${lectureContent}

AI Configuration Settings:
- Temperature: ${aiConfig.temperature} (affects explanation variety)
- Creativity Level: ${aiConfig.creativity_level} (affects presentation style)
- Detail Level: ${aiConfig.detail_level} (affects depth of content extraction)
${aiConfig.custom_instructions ? `\nCustom Instructions:\n${aiConfig.custom_instructions}` : ''}

CONTENT GENERATION REQUIREMENTS:

Each theory slide should be between 400-500 words and provide engaging, clear explanations.
Focus ONLY on the concepts outlined in the segment description - DO NOT overlap with other segments.

Theory Slides Requirements:
1. Clear, engaging writing style
2. Logical flow of ideas
3. Concrete examples and applications
4. Step-by-step explanations where needed
5. NO emojis or informal language

Use the following markdown formatting:
- Headers (##, ###) for major sections
- Bullet points for lists
- **Bold** for key terms
- *Italic* for emphasis
- > Blockquotes for important concepts

For mathematical content:
- Use LaTeX notation: $equation$
- Explain each variable
- Include practical examples

Required JSON Structure:
{
  "theory_slide_1": "markdown content (400-500 words)",
  "theory_slide_2": "markdown content (400-500 words)",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "clear, focused question",
    "options": ["4 distinct options"],
    "correctAnswer": "exact match to one option",
    "explanation": "why this is correct"
  },
  "quiz_question_2": {
    "type": "true_false",
    "question": "clear statement to evaluate",
    "correctAnswer": boolean,
    "explanation": "detailed explanation"
  }
}`;

  return basePrompt;
};

export const generateContent = async (prompt: string): Promise<string> => {
  console.log('Generating content with prompt:', prompt);
  
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': Deno.env.get('GOOGLE_API_KEY') || '',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 3000,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google API error (attempt ${attempt}/${maxRetries}):`, response.status, errorText);
        
        if (response.status === 429) {
          // Rate limit hit - wait and retry
          const retryDelay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Rate limit hit. Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        throw new Error(`Google API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Raw Google API response:', JSON.stringify(data, null, 2));
      
      // Extract the generated content from Gemini's response
      const generatedContent = data.candidates[0].content.parts[0].text;
      return generatedContent;

    } catch (error) {
      if (attempt === maxRetries) {
        console.error('All retry attempts failed:', error);
        throw error;
      }
      console.error(`Attempt ${attempt} failed:`, error);
      await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
    }
  }

  throw new Error('Failed to generate content after all retry attempts');
};

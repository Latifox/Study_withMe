
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
  console.log('Generating content with prompt length:', prompt.length);
  
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educator that generates educational content. You MUST return a valid JSON object following the exact structure provided in the prompt.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 3000,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API error (attempt ${attempt}/${maxRetries}):`, response.status, errorText);
        
        if (response.status === 429) {
          // Rate limit hit - wait and retry
          const retryDelay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Rate limit hit. Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Raw OpenAI response received');
      
      // Extract the generated content from OpenAI's response
      if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid response structure:', JSON.stringify(data, null, 2));
        throw new Error('Invalid response structure from OpenAI');
      }

      const generatedContent = data.choices[0].message.content;
      
      // Validate that the response is valid JSON
      try {
        const parsed = JSON.parse(generatedContent);
        console.log('Successfully parsed response as JSON');
        
        // Basic structure validation
        if (!parsed.theory_slide_1 || !parsed.theory_slide_2 || 
            !parsed.quiz_question_1 || !parsed.quiz_question_2) {
          throw new Error('Missing required fields in generated content');
        }
      } catch (error) {
        console.error('Failed to parse or validate OpenAI response:', error);
        if (attempt < maxRetries) {
          console.log('Retrying with attempt', attempt + 1);
          continue;
        }
        throw new Error('Failed to generate valid JSON content');
      }
      
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

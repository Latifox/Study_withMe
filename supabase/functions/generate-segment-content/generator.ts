
import { GeneratedContent } from "./types.ts";

export const generatePrompt = (
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  aiConfig: any
) => {
  const basePrompt = `You are tasked with generating educational content based STRICTLY and EXCLUSIVELY on the following lecture content. DO NOT add any information from external sources or general knowledge.

LECTURE CONTENT TO USE AS SOLE SOURCE:
${lectureContent}

TASK:
Generate detailed educational content for a segment titled "${segmentTitle}" with the following description: "${segmentDescription}".

CRITICAL REQUIREMENTS:
1. LANGUAGE: Analyze the lecture content's language and generate ALL content in EXACTLY THE SAME LANGUAGE as the lecture content.
2. SOURCE RESTRICTION: Use ONLY information present in the provided lecture content. DO NOT add any external information, examples, or explanations not explicitly found in the lecture content.
3. ACCURACY: Ensure all generated content directly corresponds to specific parts of the lecture content.

AI Configuration Settings:
- Temperature: ${aiConfig.temperature} (affects explanation variety)
- Creativity Level: ${aiConfig.creativity_level} (affects presentation style)
- Detail Level: ${aiConfig.detail_level} (affects depth of content extraction)
${aiConfig.custom_instructions ? `\nCustom Instructions:\n${aiConfig.custom_instructions}` : ''}

CONTENT GENERATION REQUIREMENTS:
Each theory slide should be 400-500 words and provide clear explanations using ONLY information from the lecture content.

Theory Slides Requirements:
1. Use ONLY information and examples from the lecture content
2. Maintain the same language as the lecture content
3. Logical flow following the lecture's structure
4. NO external examples or additional context
5. NO emojis or informal language

Use the following markdown formatting:
- Headers (##, ###) for major sections
- Bullet points for lists
- **Bold** for key terms found in the lecture
- *Italic* for emphasis
- > Blockquotes for direct quotes from the lecture content

For mathematical content:
- Use LaTeX notation: $equation$ (ONLY if present in the lecture content)
- Explain variables using ONLY the definitions provided in the lecture
- Use ONLY examples from the lecture content

Quiz Requirements:
- ALL questions must be based on explicit information from the lecture content
- Answers must be verifiable from the lecture content
- No questions about general knowledge or external context

Required JSON Structure:
{
  "theory_slide_1": "markdown content (400-500 words, strictly from lecture)",
  "theory_slide_2": "markdown content (400-500 words, strictly from lecture)",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "question based on explicit lecture content",
    "options": ["4 options from lecture content"],
    "correctAnswer": "correct option from above",
    "explanation": "explanation using only lecture content"
  },
  "quiz_question_2": {
    "type": "true_false",
    "question": "statement based on lecture content",
    "correctAnswer": boolean,
    "explanation": "explanation using only lecture content"
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

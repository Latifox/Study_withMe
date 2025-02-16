
import { GeneratedContent } from "./types.ts";

export const generatePrompt = (
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  aiConfig: any
) => {
  const basePrompt = `You are tasked with generating educational content for a SPECIFIC SET OF CONCEPTS from the lecture content.

SEGMENT SCOPE:
Title: "${segmentTitle}"
Concepts to Cover: "${segmentDescription}"

LECTURE CONTENT (SOURCE MATERIAL):
${lectureContent}

CRITICAL REQUIREMENTS:

1. STRICT CONCEPT ADHERENCE:
   - Generate content ONLY for the concepts listed in the segment description
   - DO NOT include information about concepts from other segments
   - If a concept isn't explicitly listed in the segment description, DO NOT include it

2. CONTENT BOUNDARIES:
   - Stay STRICTLY within the scope defined by the segment description
   - If you find related concepts in the lecture, but they're not listed in the description, DO NOT include them
   - Focus deeply on the listed concepts rather than trying to cover additional material

3. SOURCE RESTRICTION:
   - Use ONLY information present in the provided lecture content
   - DO NOT add external information or examples
   - All content must be directly verifiable from the lecture content

4. LANGUAGE MATCHING:
   - Use EXACTLY the same language as the lecture content
   - Maintain consistent terminology with the source material

AI Configuration Settings:
- Temperature: ${aiConfig.temperature}
- Creativity Level: ${aiConfig.creativity_level}
- Detail Level: ${aiConfig.detail_level}
${aiConfig.custom_instructions ? `\nCustom Instructions:\n${aiConfig.custom_instructions}` : ''}

CONTENT REQUIREMENTS:

Theory Slides:
1. Focus exclusively on the concepts listed in the segment description
2. Each slide should be 400-500 words
3. Use only examples from the lecture that relate to the listed concepts
4. Maintain clear boundaries - don't drift into other concepts

Formatting:
- Headers (##, ###) for concept sections
- **Bold** for key terms from the lecture
- *Italic* for emphasis
- > Blockquotes for direct quotes
- LaTeX notation: $equation$ (only if present in lecture)

Quiz Requirements:
- Questions MUST test ONLY the concepts listed in the segment description
- All answers must come directly from the lecture content
- Focus on the specific concepts, not general knowledge

Required JSON Structure:
{
  "theory_slide_1": "focused content on listed concepts only",
  "theory_slide_2": "deeper exploration of listed concepts only",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "question about listed concepts only",
    "options": ["4 options from lecture"],
    "correctAnswer": "correct option",
    "explanation": "explanation using lecture content"
  },
  "quiz_question_2": {
    "type": "true_false",
    "question": "statement about listed concepts",
    "correctAnswer": boolean,
    "explanation": "explanation from lecture"
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

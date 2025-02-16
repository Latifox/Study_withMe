import { GeneratedContent } from "./types.ts";

export const generatePrompt = (
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  aiConfig: any
) => {
  // Language configuration
  const languageInstruction = aiConfig.content_language 
    ? `IMPORTANT: Generate ALL content in ${getLanguageName(aiConfig.content_language)} language.`
    : "IMPORTANT: Generate ALL content in the same language as the lecture content.";

  const basePrompt = `You are tasked with generating educational content for a SPECIFIC SET OF CONCEPTS from the lecture content.

${languageInstruction}

SEGMENT SCOPE:
Title: "${segmentTitle}"
Concepts to Cover: "${segmentDescription}"

LECTURE CONTENT (SOURCE MATERIAL):
${lectureContent}

CRITICAL REQUIREMENTS:

1. LANGUAGE CONSISTENCY:
   - ALL content (headers, text, examples, questions) must be in the specified language
   - Maintain consistent terminology throughout
   - Use appropriate language-specific formatting and punctuation

2. WORD COUNT ENFORCEMENT:
   - Each theory slide MUST be EXACTLY 400-500 words
   - Break content into logical paragraphs of 3-4 sentences each
   - Format text with proper headers and sections

3. FORMATTING REQUIREMENTS:
   - Start with a clear ## Introduction header
   - Use ### subheaders to break up content
   - Include precisely 2-3 paragraphs per section
   - Add bullet points for key concepts
   - Use blockquotes for important definitions
   - Bold all key terms from the lecture
   - Use proper spacing between sections

4. CONTENT STRUCTURE:
   - Slide 1: Overview and basic concepts (400-500 words)
   - Slide 2: Detailed explanation and examples (400-500 words)
   - Each slide must be self-contained
   - Include clear section breaks

5. STRICT SOURCE ADHERENCE:
   - Use ONLY information from the lecture content
   - Match the lecture's language style
   - Use the same terminology as the source

FORMAT EXAMPLE:

## Introduction
Clear opening paragraph explaining the main concept.

### Key Concepts
- **Term 1**: Definition from lecture
- **Term 2**: Definition from lecture

### Detailed Explanation
Main explanation paragraph (3-4 sentences).

> Important definition or quote from lecture

Concluding paragraph with key points.

Required JSON Structure:
{
  "theory_slide_1": "formatted content following structure above (400-500 words)",
  "theory_slide_2": "formatted content following structure above (400-500 words)",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "question based on explicit content",
    "options": ["4 options from lecture"],
    "correctAnswer": "correct option",
    "explanation": "explanation using lecture content"
  },
  "quiz_question_2": {
    "type": "true_false",
    "question": "statement from lecture content",
    "correctAnswer": boolean,
    "explanation": "explanation using lecture content"
  }
}`;

  return basePrompt;
};

// Helper function to get full language name from code
function getLanguageName(code: string): string {
  const languages: { [key: string]: string } = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean'
  };
  return languages[code] || code;
}

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

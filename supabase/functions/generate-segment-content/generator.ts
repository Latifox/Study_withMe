
import { AIConfig } from "./types.ts";

export const generatePrompt = (
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  aiConfig: AIConfig
) => {
  const languageInstruction = aiConfig.content_language 
    ? `Please provide all content in ${aiConfig.content_language}` 
    : '';

  // Sanitize and truncate lecture content if too long
  const maxContentLength = 15000; // OpenAI has token limits
  const truncatedContent = lectureContent.length > maxContentLength 
    ? lectureContent.substring(0, maxContentLength) + "..."
    : lectureContent;

  console.log('Generating prompt for segment:', segmentTitle);
  console.log('Content length:', truncatedContent.length);

  return `You are an expert educator tasked with creating engaging content for a lecture segment.
Use ONLY the provided lecture content as your source material.

SEGMENT TITLE: "${segmentTitle}"

SEGMENT DESCRIPTION: "${segmentDescription}"

SOURCE CONTENT:
"""
${truncatedContent}
"""

${aiConfig.custom_instructions ? `\nADDITIONAL INSTRUCTIONS:\n${aiConfig.custom_instructions}` : ''}
${languageInstruction}

Create a structured educational segment with the following components:

1. THEORY SLIDES:
   First slide (theory_slide_1): 
   - Focus on introducing fundamental concepts
   - Length: 300-400 words
   - Keep it clear and engaging
   
   Second slide (theory_slide_2):
   - Build upon the first slide
   - Include specific examples from the lecture
   - Length: 300-400 words
   - Demonstrate practical applications

2. ASSESSMENT QUESTIONS:
   Multiple Choice Question (quiz_1):
   - Create a conceptual question testing understanding
   - Provide exactly 4 distinct options
   - Include clear explanation for the correct answer
   
   True/False Question (quiz_2):
   - Create a nuanced statement based on the content
   - Include clear reasoning for why it's true or false

YOUR RESPONSE MUST BE VALID JSON with this exact structure:
{
  "theory_slide_1": "content...",
  "theory_slide_2": "content...",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "question text...",
  "quiz_1_options": ["option1", "option2", "option3", "option4"],
  "quiz_1_correct_answer": "exact match to one of the options",
  "quiz_1_explanation": "explanation...",
  "quiz_2_type": "true_false",
  "quiz_2_question": "statement...",
  "quiz_2_correct_answer": true or false,
  "quiz_2_explanation": "reasoning..."
}

Remember: Use ONLY information from the provided lecture content. Do not add external knowledge.`;
};

const delay = (attempts: number) => {
  const baseDelay = 2000;
  const maxDelay = 32000;
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
  const jitter = Math.random() * 1000;
  return exponentialDelay + jitter;
};

export const generateContent = async (prompt: string, maxRetries = 3) => {
  console.log('Generating content with prompt length:', prompt.length);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const waitTime = delay(attempt - 1);
        console.log(`Retry attempt ${attempt}, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'You are an expert educator that creates lecture content. Always return complete, valid JSON containing all required fields. Each multiple choice question must have exactly 4 options.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      console.log('Received response from OpenAI');

      try {
        const parsed = JSON.parse(content);
        console.log('Successfully parsed JSON response');
        
        // Validate all required fields are present and have the correct format
        if (!parsed.theory_slide_1 || !parsed.theory_slide_2) {
          throw new Error('Missing theory slides');
        }

        if (!parsed.quiz_1_type || parsed.quiz_1_type !== 'multiple_choice') {
          throw new Error('Invalid quiz_1_type');
        }

        if (!Array.isArray(parsed.quiz_1_options) || parsed.quiz_1_options.length !== 4) {
          throw new Error('Invalid quiz_1_options format - must be array of exactly 4 options');
        }

        if (!parsed.quiz_1_correct_answer || !parsed.quiz_1_options.includes(parsed.quiz_1_correct_answer)) {
          throw new Error('Invalid quiz_1_correct_answer - must match one of the options');
        }

        if (!parsed.quiz_2_type || parsed.quiz_2_type !== 'true_false') {
          throw new Error('Invalid quiz_2_type');
        }

        if (typeof parsed.quiz_2_correct_answer !== 'boolean') {
          throw new Error('Invalid quiz_2_correct_answer type - must be boolean');
        }

        // If all validations pass, return the stringified JSON
        console.log('All validations passed, returning content');
        return JSON.stringify(parsed);
      } catch (error) {
        console.error('Content validation failed:', error.message);
        if (attempt === maxRetries) {
          throw new Error(`Failed to validate content: ${error.message}`);
        }
        console.log('Will retry due to validation failure...');
        continue;
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.error(`Attempt ${attempt + 1} failed:`, error);
      continue;
    }
  }

  throw new Error('Failed to generate valid content after all retries');
};

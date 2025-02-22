
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

  return `As an expert educator, create engaging educational content for the following lecture segment.

SEGMENT TITLE: "${segmentTitle}"

SEGMENT DESCRIPTION: "${segmentDescription}"

LECTURE CONTENT TO USE AS SOURCE:
"""
${truncatedContent}
"""

${aiConfig.custom_instructions ? `\nADDITIONAL INSTRUCTIONS:\n${aiConfig.custom_instructions}` : ''}
${languageInstruction}

IMPORTANT REQUIREMENTS:

1. You MUST only use information from the provided lecture content above - no external knowledge.

2. Generate the following content structure:

A. Two theory slides that build upon each other:
   - theory_slide_1: Introduce the core concepts (300-400 words)
   - theory_slide_2: Deeper exploration with examples from the lecture (300-400 words)

B. Two assessment questions:
   - quiz_1 (multiple choice):
     * type: "multiple_choice"
     * quiz_1_question: Create a conceptual question
     * quiz_1_options: Array of 4 distinct options
     * quiz_1_correct_answer: One of the options
     * quiz_1_explanation: Clear explanation
   
   - quiz_2 (true/false):
     * type: "true_false"
     * quiz_2_question: Create a nuanced statement
     * quiz_2_correct_answer: Boolean
     * quiz_2_explanation: Clear reasoning

Your response must be valid JSON containing all these fields.`;
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
              content: 'You are an expert educator that creates lecture content. Always return complete, valid JSON containing all required fields. Format all content clearly.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          if (attempt === maxRetries) {
            throw new Error(`OpenAI rate limit exceeded after ${maxRetries} retries`);
          }
          console.log('Rate limit hit, will retry...');
          continue;
        }
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      console.log('Received response from OpenAI');

      try {
        const parsed = JSON.parse(content);
        console.log('Successfully parsed response');
        
        // Validate the minimal required structure
        if (!parsed.theory_slide_1 || !parsed.theory_slide_2) {
          console.error('Missing required slides in response:', parsed);
          if (attempt < maxRetries) {
            console.log('Will retry due to missing slides...');
            continue;
          }
          throw new Error('Response missing required theory slides');
        }

        if (typeof parsed.quiz_2_correct_answer !== 'boolean') {
          console.error('Invalid quiz_2_correct_answer type:', typeof parsed.quiz_2_correct_answer);
          if (attempt < maxRetries) {
            console.log('Will retry due to invalid quiz_2_correct_answer...');
            continue;
          }
          throw new Error('Invalid quiz_2_correct_answer type');
        }

        // Additional validation
        if (!Array.isArray(parsed.quiz_1_options) || parsed.quiz_1_options.length !== 4) {
          console.error('Invalid quiz_1_options:', parsed.quiz_1_options);
          if (attempt < maxRetries) {
            continue;
          }
          throw new Error('Invalid quiz_1_options format');
        }

        console.log('Successfully validated content structure');
        return JSON.stringify(parsed);
      } catch (error) {
        if (attempt === maxRetries) {
          console.error('Failed to parse or validate response:', content);
          throw new Error('Invalid or incomplete response from OpenAI');
        }
        console.log('Invalid or incomplete response, will retry...');
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

  throw new Error('Failed to generate complete content after all retries');
};

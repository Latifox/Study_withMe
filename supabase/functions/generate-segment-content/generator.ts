
import { AIConfig } from "./types.ts";

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
1. You MUST generate TWO complete theory slides, each containing:
   - Between 300 and 400 words
   - Full markdown formatting
   - Proper LaTeX for all mathematical expressions
2. Both slides must follow this exact structure:

For EACH slide (both slide 1 AND slide 2):
## Introduction
- Overview of the topic
- Context and importance
- Connection to broader concepts

## Main Concepts
- Detailed explanation of core principles
- Key definitions and terminology
- Theoretical framework
- Mathematical foundations (with LaTeX)

## Examples and Applications
- Real-world examples
- Practical applications
- Case studies or scenarios
- Step-by-step demonstrations

## Practical Implications
- Industry relevance
- Future applications
- Societal impact

## Summary
- Key takeaways
- Connection to next topics

LATEX FORMATTING REQUIREMENTS:
ALL mathematical expressions MUST use LaTeX:
- Inline math: $x + y = z$
- Display math: $$\\frac{d}{dx}x^2 = 2x$$
- Basic operators: $+$, $-$, $\\times$, $\\div$
- Fractions: $\\frac{a}{b}$
- Powers: $x^2$, $e^x$
- Greek letters: $\\alpha$, $\\beta$
- Functions: $f(x)$, $\\sin(x)$

QUIZ REQUIREMENTS:
1. Quiz 1 MUST be multiple choice with:
   - type: "multiple_choice"
   - question: clear, >10 characters
   - options: exactly 4 options as array
   - correct_answer: must match one option exactly
   - explanation: detailed, >20 characters

2. Quiz 2 MUST be true/false with:
   - type: "true_false"
   - question: clear, >10 characters
   - correct_answer: must be boolean (true or false)
   - explanation: detailed, >20 characters`;

  return `You are an expert educator creating high-quality educational content.
${languageInstruction}

Custom Instructions: ${aiConfig.custom_instructions || 'Focus on clarity and engagement'}

Content Type: ${segmentTitle}
Description: ${segmentDescription}

Source Material: ${lectureContent}

${styleInstructions}

CRITICAL: You MUST generate BOTH theory_slide_1 AND theory_slide_2. Each slide should be between 300 and 400 words. Partial responses are not acceptable.

Return a complete JSON object with all required fields:
{
  "theory_slide_1": "First comprehensive slide (300-400 words)",
  "theory_slide_2": "Second comprehensive slide (300-400 words)",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "Clear question (>10 chars)",
  "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "quiz_1_correct_answer": "Option that exactly matches one of the options",
  "quiz_1_explanation": "Detailed explanation (>20 chars)",
  "quiz_2_type": "true_false",
  "quiz_2_question": "Clear question (>10 chars)",
  "quiz_2_correct_answer": true,
  "quiz_2_explanation": "Detailed explanation (>20 chars)"
}`;
};

const delay = (attempts: number) => {
  const baseDelay = 2000; // Start with 2 seconds
  const maxDelay = 32000; // Max delay of 32 seconds
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
  const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
  return exponentialDelay + jitter;
};

export const generateContent = async (prompt: string, maxRetries = 3) => {
  console.log('Generating content with prompt:', prompt);

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
          model: 'gpt-4o-mini-2024-07-18',
          messages: [
            { 
              role: 'system', 
              content: `You are an expert educator generating comprehensive educational content.
CRITICAL REQUIREMENTS:
1. You MUST generate TWO complete theory slides
2. Both slides must follow the provided structure
3. All mathematical content must use LaTeX
4. Return complete, valid JSON with ALL required fields including quiz_2_correct_answer as boolean
5. Never return partial responses`
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

      try {
        const parsed = JSON.parse(content);
        console.log('Parsed response:', JSON.stringify(parsed, null, 2));
        
        // Validate the minimal structure before returning
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

        console.log('Successfully generated and validated content');
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

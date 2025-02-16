
import { AIConfig } from "./types.ts";

const wordCount = (text: string): number => {
  return text.trim().split(/\s+/).length;
};

const MIN_WORDS = 300;
const MAX_WORDS = 400;

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
   - Between ${MIN_WORDS} and ${MAX_WORDS} words
   - Full markdown formatting
   - Proper LaTeX for all mathematical expressions
2. Both slides must follow this exact structure:

For EACH slide (both slide 1 AND slide 2):
## Introduction (50-75 words)
- Overview of the topic
- Context and importance
- Connection to broader concepts

## Main Concepts (150-175 words)
- Detailed explanation of core principles
- Key definitions and terminology
- Theoretical framework
- Mathematical foundations (with LaTeX)

## Examples and Applications (50-75 words)
- Real-world examples
- Practical applications
- Case studies or scenarios
- Step-by-step demonstrations

## Practical Implications (25-50 words)
- Industry relevance
- Future applications
- Societal impact

## Summary (25 words)
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
1. Each quiz MUST include:
   - type: "multiple_choice" or "true_false"
   - question: clear, >10 characters
   - explanation: detailed, >20 characters
   - correct_answer: matching type format
2. For multiple_choice:
   - At least 4 options
   - correct_answer must match an option
3. For true_false:
   - correct_answer must be boolean

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

CRITICAL: You MUST generate BOTH theory_slide_1 AND theory_slide_2. Partial responses are not acceptable.

Return a complete JSON object with all required fields:
{
  "theory_slide_1": "First comprehensive slide (${MIN_WORDS}-${MAX_WORDS} words)",
  "theory_slide_2": "Second comprehensive slide (${MIN_WORDS}-${MAX_WORDS} words)",
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

// Delay function with exponential backoff
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
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: `You are an expert educator generating comprehensive educational content.
CRITICAL REQUIREMENTS:
1. You MUST generate TWO complete theory slides
2. Each slide must have ${MIN_WORDS}-${MAX_WORDS} words
3. Both slides must follow the provided structure
4. All mathematical content must use LaTeX
5. Return complete, valid JSON with ALL required fields
6. Never return partial responses`
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
        
        // Validate the minimal structure before returning
        if (!parsed.theory_slide_1 || !parsed.theory_slide_2) {
          console.error('Missing required slides in response:', parsed);
          if (attempt < maxRetries) {
            console.log('Will retry due to missing slides...');
            continue;
          }
          throw new Error('Response missing required theory slides');
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

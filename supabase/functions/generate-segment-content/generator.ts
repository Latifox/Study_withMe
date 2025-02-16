
import { AIConfig } from "./types.ts";

const wordCount = (text: string): number => {
  return text.trim().split(/\s+/).length;
};

const MIN_WORDS = 400;
const MAX_WORDS = 600;

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
CRITICAL WORD COUNT REQUIREMENTS:
Each theory slide MUST contain AT LEAST ${MIN_WORDS} words and NO MORE than ${MAX_WORDS} words. Current content is too short.
Follow this precise word distribution:
1. Introduction: 75-100 words
2. Main Concepts: 200-250 words
3. Examples and Applications: 100-150 words
4. Practical Implications: 50-75 words
5. Summary: 25-50 words
Total required: At least ${MIN_WORDS} words per slide.

CRITICAL LaTeX REQUIREMENTS:
ALL mathematical expressions MUST use LaTeX formatting:
- Wrap inline math in single $ (e.g., $x + y = z$)
- Wrap display math in double $$ (e.g., $$\\frac{d}{dx}x^2 = 2x$$)
- Basic operators: $+$, $-$, $\\times$, $\\div$, $=$, $<$, $>$
- Fractions: $\\frac{numerator}{denominator}$
- Powers: $x^2$, $e^x$
- Greek letters: $\\alpha$, $\\beta$, $\\theta$
- Functions: $f(x)$, $\\sin(x)$, $\\cos(x)$
- Integrals: $\\int f(x) dx$
- Derivatives: $\\frac{d}{dx}$
- Special symbols: $\\infty$, $\\pm$, $\\partial$

Format the content using these guidelines:
1. Break down complex topics into digestible sections using ## headers
2. Use **bold** for key terms and *italic* for emphasis
3. Create lists for step-by-step explanations:
   - Use bullet points for related items
   - Use numbered lists for sequences
4. Use markdown tables for comparing concepts
5. Include code blocks with proper syntax highlighting if relevant
6. Add block quotes for important definitions or key points

REQUIRED SECTION STRUCTURE (you must include ALL sections with minimum word counts):
## Introduction (75-100 words)
- Overview of the topic
- Context and importance
- Connection to broader concepts

## Main Concepts (200-250 words)
- Detailed explanation of core principles
- Key definitions and terminology
- Theoretical framework
- Mathematical foundations (with LaTeX)

## Examples and Applications (100-150 words)
- Real-world examples
- Practical applications
- Case studies or scenarios
- Step-by-step demonstrations

## Practical Implications (50-75 words)
- Industry relevance
- Future applications
- Societal impact

## Summary (25-50 words)
- Key takeaways
- Connection to next topics

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

IMPORTANT: Each theory slide MUST have AT LEAST ${MIN_WORDS} words. Current content is too short. DO NOT submit content with fewer words.

Return a JSON object with no markdown block markers in this exact format:
{
  "theory_slide_1": "Comprehensive slide 1 (${MIN_WORDS}-${MAX_WORDS} words, following structure above)",
  "theory_slide_2": "Comprehensive slide 2 (${MIN_WORDS}-${MAX_WORDS} words, following structure above)",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "Clear, thought-provoking question",
  "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "quiz_1_correct_answer": "Correct option (must match exactly one of the options)",
  "quiz_1_explanation": "Detailed explanation with markdown formatting",
  "quiz_2_type": "true_false",
  "quiz_2_question": "Clear true/false question",
  "quiz_2_correct_answer": true,
  "quiz_2_explanation": "Detailed explanation with markdown formatting"
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
        // Wait before retrying with exponential backoff
        const waitTime = delay(attempt - 1);
        console.log(`Retry attempt ${attempt}, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // For word count failures, add emphasis in the retry
        if (attempt === 1) {
          prompt = prompt.replace('CRITICAL WORD COUNT REQUIREMENTS', 
            'ABSOLUTELY CRITICAL: PREVIOUS ATTEMPT HAD TOO FEW WORDS. WORD COUNT REQUIREMENTS');
        }
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
              content: `You are an expert educator creating comprehensive educational content.
Your primary task is to generate detailed theory slides between ${MIN_WORDS} and ${MAX_WORDS} words each.
You MUST ensure each slide has AT LEAST ${MIN_WORDS} words.
Use proper markdown formatting and LaTeX where appropriate.
Always return valid JSON without any markdown block markers around it.`
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

      // Additional safety check to ensure we have valid JSON
      try {
        const parsed = JSON.parse(content);
        console.log('Successfully generated and parsed content');
        return JSON.stringify(parsed);
      } catch (error) {
        if (attempt === maxRetries) {
          console.error('Failed to parse OpenAI response as JSON:', content);
          throw new Error('Invalid JSON response from OpenAI');
        }
        console.log('Invalid JSON response, will retry...');
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

  throw new Error('Failed to generate content after all retries');
};


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

  return `You are an expert educator creating high-quality educational content.
${languageInstruction}

Your task is to create TWO comprehensive theory slides and TWO challenging quiz questions focusing on these specific concepts:
${segmentDescription}

Content Type: ${segmentTitle}
Source Material: ${lectureContent}

CRITICAL REQUIREMENTS:

1. Content Organization:
   - Each theory slide should focus on DIFFERENT concepts from the list above
   - Do not mix concepts between slides
   - Present complete, in-depth explanations of each concept
   - Use clear headings and structured content

2. Word Count:
   - EACH theory slide MUST contain BETWEEN 300 AND 400 WORDS
   - This is a target requirement (acceptable range: 225-550 words)

3. Content Source:
   - Use ONLY information from the provided lecture content
   - Focus on explaining the listed concepts thoroughly
   - Stay focused on the specific topics assigned to this segment

4. LaTeX Formatting:
   - Format ALL mathematical expressions using LaTeX
   - Use $\\text{word}$ for text within math
   - Use $\\rightarrow$ for arrows
   - Use proper LaTeX syntax for all mathematical notation

5. Quizzes:
   - Quiz 1 (Multiple Choice):
     * Create a challenging conceptual question about the concepts
     * All 4 options should seem plausible
     * Test deep understanding, not memorization
   
   - Quiz 2 (True/False):
     * Create a subtle, nuanced statement about the concepts
     * The answer should require careful analysis
     * Avoid obvious true/false statements

${aiConfig.custom_instructions ? `Additional Instructions: ${aiConfig.custom_instructions}` : ''}

Return a JSON object with:
{
  "theory_slide_1": "First comprehensive slide",
  "theory_slide_2": "Second comprehensive slide",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "challenging question",
  "quiz_1_options": ["four", "plausible", "answer", "options"],
  "quiz_1_correct_answer": "must match one option",
  "quiz_1_explanation": "detailed explanation",
  "quiz_2_type": "true_false",
  "quiz_2_question": "nuanced statement",
  "quiz_2_correct_answer": boolean,
  "quiz_2_explanation": "detailed explanation"
}`;
};

const delay = (attempts: number) => {
  const baseDelay = 2000;
  const maxDelay = 32000;
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
  const jitter = Math.random() * 1000;
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
              content: `You are an expert educator generating educational content.
Key requirements:
1. Use ONLY information from the provided lecture content
2. Format all LaTeX properly (\\text{}, \\rightarrow, etc.)
3. Create challenging, nuanced quiz questions
4. Return complete JSON with all required fields`
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

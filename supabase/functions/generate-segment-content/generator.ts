
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

  return `As an expert educator, create engaging, lecture-specific learning content for a segment titled "${segmentTitle}". 
The segment is part of this lecture content: ${lectureContent}
The segment should specifically focus on these concepts: ${segmentDescription}

${aiConfig.custom_instructions ? `\nAdditional Instructions:\n${aiConfig.custom_instructions}` : ''}
${languageInstruction}

Important requirements:
1. You MUST source information ONLY from the provided lecture content, no external sources.
2. Structure your response in a logical, pedagogically sound way that best fits THIS specific lecture topic.
3. Create two complementary theory slides that naturally build upon each other:
   - theory_slide_1: A foundational explanation of the core concepts
   - theory_slide_2: A deeper exploration with relevant examples and applications from the lecture
   Ensure each slide contains sufficient content (at least 150 words) while remaining clear and focused.

4. Design two assessment questions that thoughtfully test understanding:
   - First quiz (quiz_1):
     * type: "multiple_choice"
     * quiz_1_question: Create a question that tests deeper understanding
     * quiz_1_options: Provide 4 well-thought-out options
     * quiz_1_correct_answer: Specify the correct option
     * quiz_1_explanation: Explain why this answer is correct
   
   - Second quiz (quiz_2):
     * type: "true_false"
     * quiz_2_question: Create a nuanced true/false question
     * quiz_2_correct_answer: Provide the answer as a boolean
     * quiz_2_explanation: Explain the reasoning

Guidelines:
- Let the content structure flow naturally based on the lecture material
- Create thought-provoking questions that test conceptual understanding
- Maintain academic rigor while being clear and engaging
- Use examples and applications specifically from the lecture content
- Structure the content in a way that best serves this particular topic`;
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
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: `You are an expert educator specializing in creating engaging, lecture-specific educational content.
Your role is to structure content in the most effective way for each unique topic, while maintaining academic rigor.
You must use ONLY information from the provided lecture content - no external knowledge.
Focus on creating clear, logically flowing content that builds understanding step by step.`
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

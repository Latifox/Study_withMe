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

  return `As an AI professor, create engaging learning content for a lecture segment with the following title: "${segmentTitle}". 
The lecture segment is part of ${lectureContent} and should cover the concepts listed in ${segmentDescription}. The content that will be generated will only source information from the lecture content, no external sources.
${aiConfig.custom_instructions ? `\nAdditional Instructions:\n${aiConfig.custom_instructions}` : ''}
${languageInstruction}

Generate content that follows this exact structure (these are required field names):
1. Two theory slides (theory_slide_1 and theory_slide_2):
   - theory_slide_1 should introduce the main concepts
   - theory_slide_2 should dive deeper with examples and applications
   Both slides should use clear, concise language with examples where appropriate.

2. Two quiz questions to test understanding:
   - First quiz (quiz_1):
     * A multiple-choice question with type "multiple_choice"
     * The question itself (quiz_1_question)
     * 4 options as an array (quiz_1_options)
     * The correct answer matching one of the options (quiz_1_correct_answer)
     * A detailed explanation (quiz_1_explanation)
   
   - Second quiz (quiz_2):
     * A true/false question with type "true_false" 
     * The question itself (quiz_2_question)
     * The correct answer as a boolean (quiz_2_correct_answer)
     * A detailed explanation (quiz_2_explanation)

Guidelines:
- Keep theory slides concise but informative
- Quiz questions should test understanding, not just memorization
- Cover different aspects of the topic between the two questions
- Ensure all content is factually accurate
- Use a clear, educational tone`;
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

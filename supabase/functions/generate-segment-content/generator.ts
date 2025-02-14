
import { GeneratedContent } from "./types.ts";

export const generatePrompt = (
  segmentTitle: string, 
  chunkPair: { chunk1: string; chunk2: string }, 
  aiConfig: any
) => {
  const basePrompt = `Generate segment titles and content in the same language as the provided lecture. Focus on accuracy and relevance to the lecture content. Ensure the content is detailed, with a clear and friendly tone. Focus only on information from the lecture to ensure accuracy and relevance.

For this segment titled "${segmentTitle}", use the following content:

CHUNK 1:
${chunkPair.chunk1}

CHUNK 2:
${chunkPair.chunk2}

AI Configuration Settings (Use these to adjust presentation style only, not content):
- Temperature: ${aiConfig.temperature} (affects explanation variety)
- Creativity Level: ${aiConfig.creativity_level} (affects presentation style)
- Detail Level: ${aiConfig.detail_level} (affects depth of content extraction)
${aiConfig.custom_instructions ? `\nCustom Instructions:\n${aiConfig.custom_instructions}` : ''}

REQUIREMENTS:

1. Theory Slide 1:
   - Focus ONLY on content from Chunk 1
   - Present core concepts exactly as they appear
   - Use mathematical foundations present in the chunk
   - Maintain precise adherence to the original content
   - Preserve the original language of the lecture

2. Theory Slide 2:
   - Focus ONLY on content from Chunk 2
   - Present applications and examples from the chunk
   - Do not create new examples or applications
   - Use only connections mentioned in the chunk
   - Maintain the same language as the original lecture

3. Quiz Questions:
   - Question 1 should test understanding of Chunk 1 content
   - Question 2 should test understanding of Chunk 2 content
   - Each question must be based solely on its respective chunk
   - Do not mix content between chunks in questions
   - Use the same language as the lecture content

LATEX FORMATTING REQUIREMENTS:
1. Use these LaTeX commands and environments:
   - \\text{} for text inside math mode
   - Math environments: align*, equation*, array
   - Greek letters: \\alpha, \\beta, \\theta, etc.
   - Vectors: \\vec{v}, \\vec{r}
   - Unit vectors: \\hat{i}, \\hat{j}, \\hat{k}
   - Fractions: \\frac{num}{den}
   - Subscripts: v_x, a_y
   - Superscripts: x^2, v^n
   - Special symbols: \\partial, \\nabla, \\infty
   - Spacing: \\quad, \\;

2. Block Math Format:
   $$
   \\begin{align*}
   x &= v_0t + x_0 \\\\
   y &= h - \\frac{1}{2}gt^2
   \\end{align*}
   $$

3. Inline Math Format:
   $\\vec{v} = \\frac{d\\vec{r}}{dt}$

Required JSON Structure:
{
  "theory_slide_1": "string with markdown and LaTeX - Based on Chunk 1",
  "theory_slide_2": "string with markdown and LaTeX - Based on Chunk 2",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "string based on Chunk 1",
    "options": ["array of 4 distinct options from Chunk 1"],
    "correctAnswer": "string matching one option",
    "explanation": "string using content from Chunk 1"
  },
  "quiz_question_2": {
    "type": "true_false",
    "question": "string based on Chunk 2",
    "correctAnswer": boolean,
    "explanation": "string using content from Chunk 2"
  }
}`;

  return basePrompt;
};

export const generateContent = async (prompt: string): Promise<string> => {
  console.log('Generating content with prompt:', prompt);
  
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': Deno.env.get('GOOGLE_API_KEY') || '',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 3000,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google API error (attempt ${attempt}/${maxRetries}):`, response.status, errorText);
        
        if (response.status === 429) {
          // Rate limit hit - wait and retry
          const retryDelay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Rate limit hit. Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        throw new Error(`Google API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Raw Google API response:', JSON.stringify(data, null, 2));
      
      // Extract the generated content from Gemini's response
      const generatedContent = data.candidates[0].content.parts[0].text;
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

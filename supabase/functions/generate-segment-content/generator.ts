
import { GeneratedContent } from "./types.ts";

export const generatePrompt = (
  segmentTitle: string, 
  chunkPair: { chunk1: string; chunk2: string }, 
  aiConfig: any
) => {
  const basePrompt = `Generate EXTENSIVE and HIGHLY DETAILED segment content in the same language as the provided lecture. Your mission is to create comprehensive educational content that thoroughly explains every concept. Each theory slide should contain AT LEAST 500 words of rich, detailed content.

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

CONTENT GENERATION REQUIREMENTS:

1. Theory Slide 1 (MINIMUM 500 words):
   - Extract and expand EVERY concept from Chunk 1
   - Create a comprehensive learning experience with:
     * Detailed explanations of each concept
     * Multiple examples for each topic
     * Real-world applications
     * Step-by-step breakdowns of complex ideas
     * Connections between different concepts
   - Include ALL of these sections:
     * Main concept introduction
     * Detailed theoretical background
     * Step-by-step explanations
     * Multiple examples with variations
     * Common misconceptions and clarifications
     * Practical applications
     * Key takeaways
   - Use extensive formatting:
     * Headers (##, ###) for EACH major section
     * Nested bullet points for detailed breakdowns
     * **Bold** for ALL key terms
     * *Italic* for definitions and emphasis
     * > Blockquotes for important theorems/principles
   - For mathematical content:
     * Include detailed step-by-step derivations
     * Explain each variable and symbol
     * Provide multiple examples with different values
     * Show alternative approaches when applicable

2. Theory Slide 2 (MINIMUM 500 words):
   - Apply the same comprehensive approach to Chunk 2
   - Maintain the same detailed structure
   - Focus heavily on practical applications
   - Include numerous examples
   - Connect concepts to real-world scenarios
   - Provide extensive explanations of each topic

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

MARKDOWN STRUCTURE REQUIREMENTS:
Each theory slide must follow this extensive structure:

## Main Topic (Comprehensive Overview)

### 1. Theoretical Background
* Fundamental principles
* Core concepts
  * Detailed explanation of each concept
  * Historical context
  * Theoretical foundations
* Key relationships between concepts

### 2. Detailed Explanations
* Step-by-step breakdowns
* Process explanations
* Component analysis
* Interconnections between ideas

### 3. Practical Examples
1. Basic example with full explanation
2. Intermediate example with variations
3. Advanced application example
4. Real-world case studies

### 4. Common Misconceptions
* Typical misunderstandings
* Clarifications
* Correct interpretations
* Prevention tips

### 5. Applications and Implications
* Real-world uses
* Practical implementations
* Industry applications
* Future developments

> Important theorems, principles, and key takeaways

Required JSON Structure:
{
  "theory_slide_1": "EXTENSIVE markdown and LaTeX content (>500 words) - Based on Chunk 1",
  "theory_slide_2": "EXTENSIVE markdown and LaTeX content (>500 words) - Based on Chunk 2",
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
}

IMPORTANT NOTES:
1. Each theory slide MUST contain at least 500 words of content
2. Include MULTIPLE examples for each concept
3. Provide DETAILED explanations for every topic
4. Use ALL the specified markdown formatting elements
5. Break down complex ideas into digestible parts
6. Include practical applications and real-world examples
7. Ensure comprehensive coverage of ALL concepts from the chunks`;

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

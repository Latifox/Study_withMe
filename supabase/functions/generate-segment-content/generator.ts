import { GeneratedContent, SegmentRequest } from "./types.ts";

export const generatePrompt = (segmentTitle: string, lectureContent: string, aiConfig: any, previousSegments: any[] = []) => {
  const sanitizedContent = lectureContent
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();

  const previousSegmentsContext = previousSegments.map((segment, index) => `
Previous Segment ${index + 1}: "${segment.title}"
Theory Content:
${segment.theory_slide_1}
${segment.theory_slide_2}
Quiz Questions:
${JSON.stringify(segment.quiz_question_1)}
${JSON.stringify(segment.quiz_question_2)}
`).join('\n\n');

  return `Create UNIQUE educational content based on this specific lecture material, focusing on a specific subtopic related to "${segmentTitle}". Do not repeat content from other segments. Format as a STRICT JSON object with carefully escaped strings.

${previousSegments.length > 0 ? `
PREVIOUS SEGMENTS CONTEXT (DO NOT REPEAT THIS CONTENT):
${previousSegmentsContext}
` : ''}

AI Configuration Settings:
- Temperature: ${aiConfig.temperature} (higher means more random/creative responses)
- Creativity Level: ${aiConfig.creativity_level} (higher means more creative and exploratory content)
- Detail Level: ${aiConfig.detail_level} (higher means more comprehensive explanations)
${aiConfig.custom_instructions ? `\nCustom Instructions:\n${aiConfig.custom_instructions}` : ''}

LATEX AND MARKDOWN FORMATTING REQUIREMENTS:

1. Use ONLY valid LaTeX syntax and commands:
   - Always use \\text{} for text inside math mode, NEVER use \\ext{}
   - Always properly close environments with \\end{...}
   - Use proper LaTeX environments: align*, equation, array, etc.

2. Block Math Formatting:
   - Wrap in double dollars with proper spacing:
     $$
     \\begin{align*}
     x &= v_0t + x_0 \\\\
     y &= h - \\frac{1}{2}gt^2
     \\end{align*}
     $$

3. Inline Math Formatting:
   - Wrap in single dollars: $\\vec{v} = \\frac{d\\vec{r}}{dt}$
   - Use \\text{} for text: $\\text{where } v \\text{ is velocity}$

4. LaTeX Commands and Symbols:
   - Vectors: $\\vec{v}$, $\\vec{r}$
   - Unit vectors: $\\hat{i}$, $\\hat{j}$, $\\hat{k}$
   - Fractions: $\\frac{numerator}{denominator}$
   - Greek letters: $\\alpha$, $\\beta$, $\\theta$
   - Operators: $\\sin$, $\\cos$, $\\tan$
   - Subscripts: $v_x$, $a_y$
   - Superscripts: $x^2$, $v^n$
   - Special symbols: $\\partial$, $\\nabla$, $\\infty$

Required JSON Structure:
{
  "theory_slide_1": "string containing properly formatted markdown with LaTeX - Core concepts and detailed formulas",
  "theory_slide_2": "string containing properly formatted markdown with LaTeX - Examples and applications",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "string asking about specific concepts from THIS segment only",
    "options": ["array of 4 distinct strings"],
    "correctAnswer": "string matching one option",
    "explanation": "string with markdown explaining the correct answer"
  },
  "quiz_question_2": {
    "type": "true_false",
    "question": "string testing understanding of THIS segment's specific content",
    "correctAnswer": boolean,
    "explanation": "string with markdown explaining why true or false"
  }
}

Focus ONLY on content specifically related to: ${segmentTitle}
Base the content strictly on this lecture material: ${sanitizedContent}`;
};

export const generateContent = async (prompt: string) => {
  console.log('Generating content with prompt:', prompt);
  
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
          content: 'You are an expert educational content creator specializing in creating unique, detailed content with proper mathematical notation. You MUST return ONLY a valid JSON object - no markdown code blocks, no extra text. The JSON object must have properly formatted and escaped markdown strings. Pay special attention to proper line breaks, markdown syntax, and LaTeX formula formatting. Use clear spacing and proper mathematical notation in all formulas. NEVER repeat content between segments.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Raw OpenAI response:', JSON.stringify(data.choices[0].message.content, null, 2));
  return data.choices[0].message.content;
};

export const cleanGeneratedContent = (content: string): string => {
  console.log('Content before parsing:', content);

  try {
    // First try to parse as is - if it's already valid JSON
    const parsed = JSON.parse(content);
    console.log('Content was valid JSON:', JSON.stringify(parsed, null, 2));
    return JSON.stringify(parsed);
  } catch (error) {
    console.log('Direct parsing failed, attempting cleaning...', error);
  }

  // More aggressive cleaning of the content
  let cleanedContent = content
    .replace(/```json\s*|\s*```/g, '')  // Remove code blocks
    .replace(/\r/g, '\n')               // Replace carriage returns with newlines
    .replace(/\t/g, ' ')                // Replace tabs with spaces
    .replace(/[\u2018\u2019]/g, "'")    // Replace smart quotes
    .replace(/[\u201C\u201D]/g, '"')    // Replace smart double quotes
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .trim();                            // Remove leading/trailing whitespace

  // Attempt to find and fix common JSON structural issues
  if (!cleanedContent.startsWith('{')) {
    const jsonStart = cleanedContent.indexOf('{');
    if (jsonStart !== -1) {
      cleanedContent = cleanedContent.substring(jsonStart);
    } else {
      throw new Error('No JSON object found in content');
    }
  }

  if (!cleanedContent.endsWith('}')) {
    const jsonEnd = cleanedContent.lastIndexOf('}');
    if (jsonEnd !== -1) {
      cleanedContent = cleanedContent.substring(0, jsonEnd + 1);
    } else {
      throw new Error('No closing brace found in JSON content');
    }
  }

  try {
    const parsed = JSON.parse(cleanedContent);
    console.log('Final processed content:', JSON.stringify(parsed, null, 2));
    return JSON.stringify(parsed);
  } catch (error) {
    console.error('Error parsing cleaned content:', error);
    console.error('Problematic content:', cleanedContent);
    throw new Error(`Failed to parse generated content: ${error.message}`);
  }
};
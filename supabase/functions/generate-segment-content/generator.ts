import { GeneratedContent, SegmentRequest } from "./types.ts";

export const generatePrompt = (segmentTitle: string, lectureContent: string, aiConfig: any, previousSegments: any[] = []) => {
  const previousSegmentsContext = previousSegments.map((segment, index) => `
Previous Segment ${index + 1}: "${segment.title}"
Theory Content:
${segment.theory_slide_1}
${segment.theory_slide_2}
Quiz Questions:
${JSON.stringify(segment.quiz_question_1)}
${JSON.stringify(segment.quiz_question_2)}
`).join('\n\n');

  return `Create comprehensive, detailed educational content for a physics lecture, focusing on the specific subtopic "${segmentTitle}". Each theory slide should be thorough and include multiple examples where appropriate. Format as a STRICT JSON object with carefully escaped strings.

${previousSegments.length > 0 ? `
PREVIOUS SEGMENTS CONTEXT (DO NOT REPEAT THIS CONTENT):
${previousSegmentsContext}
` : ''}

AI Configuration Settings:
- Temperature: ${aiConfig.temperature} (higher means more random/creative responses)
- Creativity Level: ${aiConfig.creativity_level} (higher means more creative and exploratory content)
- Detail Level: ${aiConfig.detail_level} (higher means more comprehensive explanations)
${aiConfig.custom_instructions ? `\nCustom Instructions:\n${aiConfig.custom_instructions}` : ''}

CONTENT REQUIREMENTS:
1. Theory Slide 1 should:
   - Begin with a clear introduction of the concept
   - Provide detailed mathematical foundations
   - Include step-by-step explanations
   - Use clear, academic language

2. Theory Slide 2 should:
   - Focus on practical applications
   - Include multiple worked examples
   - Connect theory to real-world scenarios
   - Provide detailed solution steps

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
  "theory_slide_1": "string with markdown and LaTeX - Detailed core concepts and formulas",
  "theory_slide_2": "string with markdown and LaTeX - Comprehensive examples and applications",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "string testing concepts from THIS segment",
    "options": ["array of 4 distinct strings"],
    "correctAnswer": "string matching one option",
    "explanation": "string with markdown explaining the answer"
  },
  "quiz_question_2": {
    "type": "true_false",
    "question": "string testing THIS segment's content",
    "correctAnswer": boolean,
    "explanation": "string with markdown explaining why true/false"
  }
}

Focus ONLY on content specifically related to: ${segmentTitle}
Base the content strictly on this lecture material: ${lectureContent}`;
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
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert physics educator specializing in creating detailed, comprehensive educational content with proper mathematical notation. You MUST return ONLY a valid JSON object - no markdown code blocks, no extra text. The JSON object must have properly formatted and escaped markdown strings with proper LaTeX notation.'
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
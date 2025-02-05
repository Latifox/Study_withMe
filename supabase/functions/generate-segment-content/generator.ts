
import { GeneratedContent } from "./types.ts";

export const generatePrompt = async (
  segmentTitle: string, 
  lectureContent: string, 
  aiConfig: any, 
  previousSegments: any[] = [],
  subjectContent: any = null
) => {
  const previousSegmentsContext = previousSegments.map((segment, index) => `
Previous Segment ${index + 1}: "${segment.title}"
Theory Content:
${segment.theory_slide_1}
${segment.theory_slide_2}
Quiz Questions:
${JSON.stringify(segment.quiz_question_1)}
${JSON.stringify(segment.quiz_question_2)}
`).join('\n\n');

  const basePrompt = `Create comprehensive, detailed educational content for a physics lecture, focusing on the specific subtopic "${segmentTitle}". Each theory slide should be thorough and include multiple examples where appropriate. Format as a STRICT JSON object with carefully escaped strings.

${previousSegments.length > 0 ? `
PREVIOUS SEGMENTS CONTEXT (IMPORTANT - DO NOT REPEAT THIS CONTENT):
${previousSegmentsContext}

GUIDELINES FOR CONTENT PROGRESSION:
1. Build upon previous segments without repeating their content
2. Reference previous concepts only when extending them
3. Maintain clear progression from earlier segments
4. Focus exclusively on new material for this segment
5. Ensure examples are unique and don't overlap with previous segments
` : ''}

AI Configuration Settings (IMPORTANT - Adjust content based on these settings):
- Temperature: ${aiConfig.temperature} (higher means more creative and varied explanations)
- Creativity Level: ${aiConfig.creativity_level} (higher means more engaging and innovative examples)
- Detail Level: ${aiConfig.detail_level} (higher means more comprehensive explanations)
${aiConfig.custom_instructions ? `\nCustom Instructions:\n${aiConfig.custom_instructions}` : ''}

CONTENT REQUIREMENTS (Adjust based on AI settings):
1. Theory Slide 1 should:
   - Begin with a clear introduction of NEW concepts
   - Provide detailed mathematical foundations (depth based on detail_level)
   - Include step-by-step explanations (complexity based on creativity_level)
   - Use clear, academic language (style varies with temperature)
   - Depth and breadth of content should scale with detail_level
   - Examples should be more creative and varied with higher creativity_level

2. Theory Slide 2 should:
   - Focus on practical applications (variety based on creativity_level)
   - Include multiple worked examples (complexity scales with detail_level)
   - Connect theory to real-world scenarios (creativity based on temperature)
   - Provide detailed solution steps (depth based on detail_level)
   - Use engaging examples that match the creativity_level
   - Explanation depth should match the detail_level setting

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
`;

  let contextualContent = `Focus ONLY on content specifically related to: ${segmentTitle}\n`;
  
  if (subjectContent) {
    contextualContent += `\nSubject Details:\nTitle: ${subjectContent.subject.title}\n`;
    if (subjectContent.subject.details) {
      contextualContent += `Details: ${subjectContent.subject.details}\n`;
    }
    
    if (subjectContent.mappings.length > 0) {
      contextualContent += `\nRelevant Content Segments:\n`;
      subjectContent.mappings.forEach((mapping: any, index: number) => {
        contextualContent += `\nSegment ${index + 1} (Relevance: ${mapping.relevance_score.toFixed(2)}):\n${mapping.content_snippet}\n`;
      });
    }
  }

  contextualContent += `\nBase the content on this lecture material: ${lectureContent}`;

  return `${basePrompt}\n\n${contextualContent}`;
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
      model: 'gpt-4',  // Fixed model name from gpt-4o to gpt-4
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


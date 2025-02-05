
import { GeneratedContent } from "./types.ts";

export const generatePrompt = (
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

  const basePrompt = `Create educational content for a lecture segment by STRICTLY using the provided subject-specific content. DO NOT invent, extrapolate, or add information not explicitly present in the provided content mappings.

${previousSegments.length > 0 ? `
PREVIOUS SEGMENTS CONTEXT (For reference only - DO NOT repeat this content):
${previousSegmentsContext}

CONTENT PROGRESSION GUIDELINES:
1. Build upon previous segments without repeating their content
2. Reference previous concepts only when extending them
3. Maintain clear progression from earlier segments
4. Focus exclusively on new material for this segment
5. Use examples ONLY from the mapped content
` : ''}

IMPORTANT CONTENT GENERATION RULES:
1. ONLY use information from the provided content mappings
2. DO NOT invent or add any formulas, examples, or explanations
3. Maintain academic accuracy by sticking strictly to the mapped content
4. Use examples ONLY if they appear in the original mapped content
5. For quiz questions, use ONLY concepts and scenarios from the mapped content

AI Configuration Settings (Use these to adjust presentation style only, not content):
- Temperature: ${aiConfig.temperature} (affects explanation variety)
- Creativity Level: ${aiConfig.creativity_level} (affects presentation style)
- Detail Level: ${aiConfig.detail_level} (affects depth of content extraction)
${aiConfig.custom_instructions ? `\nCustom Instructions:\n${aiConfig.custom_instructions}` : ''}

SLIDE REQUIREMENTS:
1. Theory Slide 1:
   - Present core concepts exactly as they appear in the mapped content
   - Include mathematical foundations ONLY if present in mapped content
   - Provide explanations using the exact terminology from the content
   - Maintain precise adherence to the original content

2. Theory Slide 2:
   - Present applications and examples ONLY from the mapped content
   - Include worked examples EXACTLY as they appear
   - Do not create new examples or applications
   - Use only real-world connections mentioned in the original content

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
  "theory_slide_1": "string with markdown and LaTeX - Extracted core concepts",
  "theory_slide_2": "string with markdown and LaTeX - Examples from mapped content",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "string based on mapped content",
    "options": ["array of 4 distinct options from content"],
    "correctAnswer": "string matching one option",
    "explanation": "string explaining using mapped content"
  },
  "quiz_question_2": {
    "type": "true_false",
    "question": "string based on mapped content",
    "correctAnswer": boolean,
    "explanation": "string using mapped content"
  }
}

${subjectContent ? `
SUBJECT-SPECIFIC CONTENT TO USE:
Title: ${subjectContent.subject.title}
${subjectContent.subject.details ? `Subject Instructions: ${subjectContent.subject.details}` : ''}

Available Content Mappings:
${subjectContent.mappings.map((mapping: any, index: number) => 
  `\nMapping ${index + 1} (Relevance: ${mapping.relevance_score.toFixed(2)}):\n${mapping.content_snippet}`
).join('\n')}

IMPORTANT: Use ONLY this mapped content when creating the slides and questions. DO NOT reference any content outside these mappings.` : ''}

Focus ONLY on content specifically related to: ${segmentTitle}`;

  return basePrompt;
};

export const generateContent = async (prompt: string): Promise<string> => {
  console.log('Generating content with prompt:', prompt);
  
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
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
        console.error(`OpenAI API error (attempt ${attempt}/${maxRetries}):`, response.status, errorText);
        
        if (response.status === 429) {
          // Rate limit hit - wait and retry
          const retryDelay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Rate limit hit. Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Raw OpenAI response:', JSON.stringify(data.choices[0].message.content, null, 2));
      return data.choices[0].message.content;

    } catch (error) {
      if (attempt === maxRetries) {
        console.error('All retry attempts failed:', error);
        throw error;
      }
      console.error(`Attempt ${attempt} failed:`, error);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
    }
  }

  throw new Error('Failed to generate content after all retry attempts');
};

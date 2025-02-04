export const generatePrompt = (segmentTitle: string, lectureContent: string, aiConfig: any) => {
  const sanitizedContent = lectureContent
    .replace(/[\n\r]/g, ' ')
    .replace(/[\t]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();

  return `Create UNIQUE educational content based on this specific lecture material, focusing on a specific subtopic related to "${segmentTitle}". Do not repeat content from other segments. Format as a STRICT JSON object with carefully escaped strings.

AI Configuration Settings:
- Temperature: ${aiConfig.temperature} (higher means more random/creative responses)
- Creativity Level: ${aiConfig.creativity_level} (higher means more creative and exploratory content)
- Detail Level: ${aiConfig.detail_level} (higher means more comprehensive explanations)
${aiConfig.custom_instructions ? `\nCustom Instructions:\n${aiConfig.custom_instructions}` : ''}

REQUIREMENTS:
1. Use only information that appears in the lecture content provided
2. Format markdown and LaTeX properly:
   - Use single line breaks with proper spacing
   - Format mathematical formulas with clear presentation:
     * Block formulas: use double dollars and spacing
       For example: 
       $$ 
       \\vec{r}(t) = x(t)\\hat{i} + y(t)\\hat{j} + z(t)\\hat{k} 
       $$
     * Inline formulas: use single dollars and proper spacing
       For example: $\\vec{v} = \\frac{d\\vec{r}}{dt}$
   - Always use proper LaTeX spacing commands (\\;, \\quad, etc)
   - Use proper vector notation (\\vec{v}, \\hat{i}, etc)
   - Use proper fractions (\\frac{numerator}{denominator})
   - Always escape backslashes in JSON (\\\\)
3. Content MUST be UNIQUE:
   - NEVER repeat concepts or examples from other segments
   - Each segment should cover a distinct subtopic
   - Break down complex topics into separate, non-overlapping segments
   - Focus on different aspects/applications in each segment
   - Never duplicate formulas or explanations between segments
4. Add relevant emoji markers for key points
5. Create proper visual hierarchy with clear headings
6. Provide detailed explanations and examples
7. Each segment should be self-contained but part of a logical progression

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
  console.log('Content before cleaning:', content);

  try {
    // First try to parse as is - if it's already valid JSON
    const parsed = JSON.parse(content);
    console.log('Content was already valid JSON');
    return JSON.stringify(parsed);
  } catch (error) {
    console.log('Direct parsing failed, attempting cleaning...', error);
  }

  // More aggressive cleaning of the content
  let cleanedContent = content
    .replace(/```json\s*|\s*```/g, '')  // Remove code blocks
    .replace(/\\n/g, ' ')               // Replace escaped newlines with spaces
    .replace(/\n/g, ' ')                // Replace actual newlines with spaces
    .replace(/\r/g, ' ')                // Replace carriage returns with spaces
    .replace(/\t/g, ' ')                // Replace tabs with spaces
    .replace(/[\u2018\u2019]/g, "'")    // Replace smart quotes
    .replace(/[\u201C\u201D]/g, '"')    // Replace smart double quotes
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\\/g, '\\\\')             // Escape backslashes properly
    .replace(/"/g, '\\"')               // Escape quotes properly
    .replace(/\s+/g, ' ')               // Collapse multiple spaces
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

  console.log('Content after cleaning:', cleanedContent);

  try {
    // Try to parse and validate the structure
    const parsed = JSON.parse(cleanedContent);
    
    // Validate required fields
    if (!parsed.theory_slide_1 || !parsed.theory_slide_2 || !parsed.quiz_question_1 || !parsed.quiz_question_2) {
      throw new Error('Missing required fields in JSON structure');
    }
    
    // Validate quiz questions
    for (const quiz of [parsed.quiz_question_1, parsed.quiz_question_2]) {
      if (!quiz.type || !quiz.question || !quiz.explanation) {
        throw new Error('Invalid quiz question structure');
      }
      if (quiz.type === 'multiple_choice' && (!Array.isArray(quiz.options) || quiz.options.length < 4)) {
        throw new Error('Multiple choice question must have at least 4 options');
      }
      if (quiz.type === 'true_false' && typeof quiz.correctAnswer !== 'boolean') {
        throw new Error('True/False question must have a boolean correct answer');
      }
    }

    return JSON.stringify(parsed);
  } catch (error) {
    console.error('Error parsing or validating cleaned content:', error);
    console.error('Problematic content:', cleanedContent);
    throw new Error(`Failed to parse or validate generated content: ${error.message}`);
  }
};

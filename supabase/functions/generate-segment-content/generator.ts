
export const generatePrompt = (segmentTitle: string, lectureContent: string) => {
  // Sanitize the lecture content to prevent JSON parsing issues
  const sanitizedContent = lectureContent
    .replace(/[\n\r]/g, ' ')  // Replace newlines with spaces
    .replace(/[\t]/g, ' ')    // Replace tabs with spaces
    .replace(/\\/g, '\\\\')   // Escape backslashes
    .replace(/"/g, '\\"')     // Escape quotes
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters

  return `Create UNIQUE educational content based on this specific lecture material, focusing on a specific subtopic related to "${segmentTitle}". Do not repeat content from other segments. Format as a STRICT JSON object with carefully escaped strings.

REQUIREMENTS:
1. Use only information that appears in the lecture content provided
2. Format markdown properly:
   - Use single line breaks with proper spacing
   - Properly escape special characters
   - Use proper markdown syntax for headers and formatting
   - Format mathematical formulas using LaTeX syntax within $$ delimiters for block formulas and $ for inline formulas
3. Keep content focused and accurate to the lecture material
4. Create UNIQUE content that does not overlap with other segments
5. Add relevant emoji markers for key points
6. Create proper visual hierarchy
7. Provide detailed explanations and examples

Required JSON Structure:
{
  "theory_slide_1": "string containing properly formatted markdown - Core concepts and detailed formulas",
  "theory_slide_2": "string containing properly formatted markdown - Examples and applications",
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

SLIDE STRUCTURE:
Slide 1 (Theory and Formulas):
- Start with a clear ## Main Concept header
- Present key definitions specific to this segment
- Format mathematical formulas using LaTeX:
  * Block formulas: $$formula$$
  * Inline formulas: $formula$
- Include all relevant mathematical formulas with explanations
- Provide detailed explanations of each concept
- End with key insights unique to this segment

Slide 2 (Applications):
- Focus on practical examples specific to this segment
- Include step-by-step problem solving if applicable
- Show formula applications with numerical examples
- Connect to real-world scenarios
- Include practice calculations or worked examples
- Summarize with practical applications

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
          content: 'You are an expert educational content creator specializing in creating unique, detailed content with proper mathematical notation. Return ONLY a valid JSON object with properly formatted and escaped markdown strings. Pay special attention to proper line breaks, markdown syntax, and LaTeX formula formatting. NO code blocks, NO invalid characters.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000, // Increased for more detailed content
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
    // First try to parse as is - if it's already valid JSON, just return it
    const parsed = JSON.parse(content);
    console.log('Content was already valid JSON');
    return JSON.stringify(parsed);
  } catch (error) {
    console.log('Direct parsing failed, attempting cleaning...');
  }

  // If direct parsing failed, try cleaning the content
  let cleanedContent = content
    .replace(/```json\s*|\s*```/g, '') // Remove code blocks
    .replace(/\\n/g, '\n')            // Convert escaped newlines to actual newlines
    .replace(/[\u2018\u2019]/g, "'")  // Replace smart quotes
    .replace(/[\u201C\u201D]/g, '"')  // Replace smart double quotes
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove all control characters
    .replace(/\\\\/g, '\\')           // Fix double escaped backslashes
    .trim();

  console.log('Content after cleaning:', cleanedContent);

  try {
    // Try to parse and validate the structure
    const parsed = JSON.parse(cleanedContent);
    
    // Validate required fields and structure
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

    // Return the validated and formatted JSON
    return JSON.stringify(parsed);
  } catch (error) {
    console.error('Error parsing or validating cleaned content:', error);
    console.error('Problematic content:', cleanedContent);
    throw new Error(`Failed to parse or validate generated content: ${error.message}`);
  }
};

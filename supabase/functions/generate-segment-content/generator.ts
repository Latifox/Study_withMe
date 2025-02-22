
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

  // Sanitize and truncate lecture content if too long
  const maxContentLength = 15000;
  const truncatedContent = lectureContent.length > maxContentLength 
    ? lectureContent.substring(0, maxContentLength) + "..."
    : lectureContent;

  console.log('Generating prompt for segment:', segmentTitle);
  console.log('Content length:', truncatedContent.length);
  console.log('Language instruction:', languageInstruction);

  return `You are a specialized educational content generator focused on creating clear, structured learning segments.

TASK: Create a focused educational segment about: "${segmentTitle}"

CONTEXT:
${segmentDescription}

SOURCE MATERIAL:
"""
${truncatedContent}
"""

${aiConfig.custom_instructions ? `\nCUSTOM INSTRUCTIONS:\n${aiConfig.custom_instructions}` : ''}
${languageInstruction}

REQUIRED OUTPUT FORMAT: Create two theory slides and two quiz questions in this exact JSON structure:
{
  "theory_slide_1": "Clear, focused content explaining fundamental concepts (300-400 words)",
  "theory_slide_2": "Detailed examples and practical applications (300-400 words)",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "A conceptual question testing understanding",
  "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "quiz_1_correct_answer": "Exact match to one of the options",
  "quiz_1_explanation": "Clear explanation of why this answer is correct",
  "quiz_2_type": "true_false",
  "quiz_2_question": "A statement testing deeper understanding",
  "quiz_2_correct_answer": true,
  "quiz_2_explanation": "Detailed explanation of why this is true/false"
}

CRITICAL REQUIREMENTS:
1. Use ONLY information from the provided source material
2. Ensure quiz_1_correct_answer EXACTLY matches one of the quiz_1_options
3. Make quiz_2_correct_answer a boolean (true/false)
4. Keep theory slides between 300-400 words each
5. Include exactly 4 options for multiple choice questions
6. Return VALID JSON with all fields present

${aiConfig.temperature > 0.7 ? 'Feel free to be creative while staying accurate.' : 'Focus on accuracy and clarity.'}`;
};

export const generateContent = async (prompt: string, maxRetries = 3) => {
  console.log('Starting content generation with prompt length:', prompt.length);

  const validateResponse = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      
      // Required fields check
      const requiredFields = [
        'theory_slide_1',
        'theory_slide_2',
        'quiz_1_type',
        'quiz_1_question',
        'quiz_1_options',
        'quiz_1_correct_answer',
        'quiz_1_explanation',
        'quiz_2_type',
        'quiz_2_question',
        'quiz_2_correct_answer',
        'quiz_2_explanation'
      ];

      const missingFields = requiredFields.filter(field => !(field in parsed));
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Multiple choice validation
      if (parsed.quiz_1_type !== 'multiple_choice') {
        throw new Error('quiz_1_type must be "multiple_choice"');
      }

      if (!Array.isArray(parsed.quiz_1_options) || parsed.quiz_1_options.length !== 4) {
        throw new Error('quiz_1_options must be an array with exactly 4 options');
      }

      if (!parsed.quiz_1_options.includes(parsed.quiz_1_correct_answer)) {
        throw new Error('quiz_1_correct_answer must match one of the options');
      }

      // True/False validation
      if (parsed.quiz_2_type !== 'true_false') {
        throw new Error('quiz_2_type must be "true_false"');
      }

      if (typeof parsed.quiz_2_correct_answer !== 'boolean') {
        throw new Error('quiz_2_correct_answer must be boolean');
      }

      // Content length validation (rough estimate)
      if (parsed.theory_slide_1.length < 200 || parsed.theory_slide_1.length > 3000) {
        throw new Error('theory_slide_1 length is outside acceptable range');
      }

      if (parsed.theory_slide_2.length < 200 || parsed.theory_slide_2.length > 3000) {
        throw new Error('theory_slide_2 length is outside acceptable range');
      }

      return parsed;
    } catch (error) {
      console.error('Validation error:', error.message);
      throw error;
    }
  };

  const delay = (attempt: number) => {
    const baseDelay = 1000;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), 8000);
    return exponentialDelay + Math.random() * 1000;
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries + 1}`);
        await new Promise(resolve => setTimeout(resolve, delay(attempt)));
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
              content: 'You are an expert educational content generator. Always return complete, valid JSON containing exactly the required fields.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`OpenAI API error (${response.status}):`, errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      console.log('Received response from OpenAI, validating...');
      const validatedContent = validateResponse(content);
      console.log('Content validation successful');
      
      return JSON.stringify(validatedContent);
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
      if (attempt === maxRetries) {
        throw new Error(`Failed to generate valid content after ${maxRetries + 1} attempts: ${error.message}`);
      }
    }
  }

  throw new Error('Failed to generate valid content after all retries');
};

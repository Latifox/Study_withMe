
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

  // Optimize content length while maintaining quality
  const maxContentLength = 12000;
  const truncatedContent = lectureContent.length > maxContentLength 
    ? lectureContent.substring(0, maxContentLength) + "..."
    : lectureContent;

  console.log('Generating prompt for segment:', segmentTitle);
  console.log('Content length:', truncatedContent.length);

  return `You are a specialized educational content generator focused on creating engaging, well-structured learning segments.

TASK: Create an engaging educational segment about: "${segmentTitle}"

CONTEXT:
${segmentDescription}

SOURCE MATERIAL:
"""
${truncatedContent}
"""

CRITICAL REQUIREMENTS:
1. Use ONLY information from the provided source material
2. Keep theory slides between 300-400 words each
3. Include exactly 4 options for multiple choice questions
4. Return VALID JSON with all fields present
5. Use proper markdown formatting for better readability
6. Ensure quiz_1_correct_answer EXACTLY matches one of the quiz_1_options
7. Make quiz_2_correct_answer a boolean (true/false)

FORMAT INSTRUCTIONS:
1. Use clear hierarchical structure with headers (# for main titles, ## for subtitles)
2. Break down complex concepts into bullet points or numbered lists
3. Include visual markers like ▶️, 💡, 🔑, ⚡️ to highlight important points
4. Use **bold** and _italic_ for emphasis
5. Break content into clear sections with descriptive headings
6. Add "Key Takeaways" sections where appropriate

${aiConfig.custom_instructions ? `\nCUSTOM INSTRUCTIONS:\n${aiConfig.custom_instructions}` : ''}
${languageInstruction}

OUTPUT FORMAT:
Return content in this exact JSON structure:
{
  "theory_slide_1": "Clear, focused content with proper markdown formatting (300-400 words)",
  "theory_slide_2": "Detailed examples and practical applications with proper markdown formatting (300-400 words)",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "A conceptual question testing understanding",
  "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "quiz_1_correct_answer": "Exact match to one of the options",
  "quiz_1_explanation": "Clear explanation of why this answer is correct",
  "quiz_2_type": "true_false",
  "quiz_2_question": "A statement testing deeper understanding",
  "quiz_2_correct_answer": true,
  "quiz_2_explanation": "Detailed explanation of why this is true/false"
}`;
};

export const generateContent = async (prompt: string) => {
  console.log('Starting content generation with prompt length:', prompt.length);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  const validateResponse = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      
      // Strict validation
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

      // Validate quiz formats
      if (!Array.isArray(parsed.quiz_1_options) || parsed.quiz_1_options.length !== 4) {
        throw new Error('quiz_1_options must be an array with exactly 4 options');
      }

      if (!parsed.quiz_1_options.includes(parsed.quiz_1_correct_answer)) {
        throw new Error('quiz_1_correct_answer must match one of the options');
      }

      if (typeof parsed.quiz_2_correct_answer !== 'boolean') {
        throw new Error('quiz_2_correct_answer must be boolean');
      }

      return parsed;
    } catch (error) {
      console.error('Validation error:', error.message);
      throw error;
    }
  };

  try {
    console.log('Making OpenAI API request...');
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
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`OpenAI API error (${response.status}):`, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received response from OpenAI, validating...');
    
    const content = data.choices[0].message.content;
    const validatedContent = validateResponse(content);
    
    console.log('Content validation successful');
    return JSON.stringify(validatedContent);

  } catch (error) {
    console.error('Content generation error:', error);
    throw error;
  }
};

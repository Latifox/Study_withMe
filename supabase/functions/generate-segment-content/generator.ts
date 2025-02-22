
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

  // Optimize content length - reduce to avoid timeouts
  const maxContentLength = 8000; // Reduced from 15000
  const truncatedContent = lectureContent.length > maxContentLength 
    ? lectureContent.substring(0, maxContentLength) + "..."
    : lectureContent;

  console.log('Generating prompt for segment:', segmentTitle);
  console.log('Content length:', truncatedContent.length);
  console.log('Language instruction:', languageInstruction);

  return `You are a specialized educational content generator focused on creating engaging, well-structured learning segments.

TASK: Create an engaging educational segment about: "${segmentTitle}"

CONTEXT:
${segmentDescription}

SOURCE MATERIAL:
"""
${truncatedContent}
"""

FORMATTING INSTRUCTIONS:
1. Use clear hierarchical structure with headers (# for main titles, ## for subtitles)
2. Break down complex concepts into bullet points or numbered lists
3. Include visual markers like ▶️, 💡, 🔑, ⚡️ to highlight important points
4. Use formatting like **bold** and _italic_ for emphasis
5. Break content into clear sections with descriptive headings
6. Add "Key Takeaways" sections where appropriate
7. Use comparisons and examples to illustrate concepts
8. Include relevant formulas or diagrams using markdown if needed

${aiConfig.custom_instructions ? `\nCUSTOM INSTRUCTIONS:\n${aiConfig.custom_instructions}` : ''}
${languageInstruction}

REQUIRED OUTPUT FORMAT: Create two engaging theory slides and two quiz questions in this exact JSON structure:
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

export const generateContent = async (prompt: string, maxRetries = 2) => { // Reduced from 3 to 2 retries
  console.log('Starting content generation with prompt length:', prompt.length);

  const validateResponse = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      
      // Basic validation
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

      return parsed;
    } catch (error) {
      console.error('Validation error:', error.message);
      throw error;
    }
  };

  const delay = (attempt: number) => {
    const baseDelay = 500; // Reduced from 1000
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), 4000); // Reduced max delay
    return exponentialDelay + Math.random() * 500; // Reduced jitter
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
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational content generator. Always return complete, valid JSON containing exactly the required fields.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000, // Reduced from 4000
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


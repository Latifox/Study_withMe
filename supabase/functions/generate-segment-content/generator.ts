
export const generatePrompt = (segmentTitle: string, lectureContent: string) => {
  return `Create educational content based on this specific lecture material. Use the lecture's actual content to create two slides and quiz questions. Format as a STRICT JSON object with carefully escaped strings.

REQUIREMENTS:
1. Use only information that appears in the lecture content provided
2. Format markdown properly:
   - Use single line breaks with proper spacing
   - Properly escape special characters
   - Use proper markdown syntax for headers and formatting
3. Keep content focused and accurate to the lecture material
4. Use clear section breaks
5. Add relevant emoji markers for key points
6. Create proper visual hierarchy

Required JSON Structure:
{
  "theory_slide_1": "string containing properly formatted markdown - Core concepts from lecture",
  "theory_slide_2": "string containing properly formatted markdown - Examples and applications from lecture",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "string",
    "options": ["array of strings"],
    "correctAnswer": "string matching one option",
    "explanation": "string with markdown"
  },
  "quiz_question_2": {
    "type": "true_false",
    "question": "string",
    "correctAnswer": boolean,
    "explanation": "string with markdown"
  }
}

SLIDE STRUCTURE:
Slide 1:
- Start with a clear ## Main Concept header
- Present key definitions from the lecture
- Use proper line spacing between elements
- Include important formulas or principles
- End with a key insight from the lecture

Slide 2:
- Focus on examples from the lecture
- Break down practical applications
- Include any relevant calculations
- Connect to real-world scenarios mentioned in the lecture
- Summarize with practical takeaways

Base the content strictly on this lecture material: ${lectureContent.replace(/"/g, '\\"')}`;
};

export const generateContent = async (prompt: string) => {
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
          content: 'You are an expert educational content creator. Return ONLY a valid JSON object with properly formatted and escaped markdown strings. Pay special attention to proper line breaks and markdown syntax. NO code blocks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

export const cleanGeneratedContent = (content: string): string => {
  return content
    .replace(/```json\s*|\s*```/g, '')  // Remove code blocks
    .replace(/\\n/g, '\n')              // Convert escaped newlines to actual newlines
    .replace(/[\u2018\u2019]/g, "'")    // Replace smart quotes
    .replace(/[\u201C\u201D]/g, '"')    // Replace smart double quotes
    .replace(/\n{3,}/g, '\n\n')         // Replace multiple newlines with double newlines
    .trim();
};

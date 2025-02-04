
export const generatePrompt = (segmentTitle: string, lectureContent: string) => {
  return `Create highly engaging and detailed educational content for the segment "${segmentTitle}". Format the response as a STRICT JSON object with carefully escaped strings.

REQUIREMENTS FOR CONTENT STYLE:
1. Make content addictive and engaging using storytelling techniques
2. Use markdown formatting extensively for visual hierarchy:
   - **Bold** for key concepts and important terms
   - ## Headers for main sections
   - * Bullet points for lists
   - > Blockquotes for important insights
   - --- for section breaks
   - \`code\` for technical terms or specific vocabulary
3. Include real-world examples and analogies
4. Break down complex concepts into digestible chunks
5. Use a conversational, engaging tone
6. Include "Did you know?" sections for interesting facts
7. Add emojis 🎯 strategically to highlight key points
8. Create clear visual hierarchy with markdown

Required JSON Structure (with proper string escaping):
{
  "theory_slide_1": "string with markdown (escaped quotes) - Introduction and core concepts",
  "theory_slide_2": "string with markdown (escaped quotes) - Detailed examples and applications",
  "quiz_question_1": {
    "type": "multiple_choice",
    "question": "string",
    "options": ["string array"],
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

THEORY SLIDE STRUCTURE GUIDELINES:
Slide 1 (Core Concepts):
- Start with an engaging hook or question
- Use ## Main Concept as header
- Break down key points with **bold** terms
- Include a > blockquote for key insight
- Add a "Did you know? 🤔" section
- End with a real-world connection

Slide 2 (Applications):
- Begin with a practical scenario
- Use bullet points for examples
- Include code examples if relevant
- Add a "Pro Tip 💡" section
- Conclude with practical applications
- Use emojis for visual engagement

Base the content on this lecture material: ${lectureContent.replace(/"/g, '\\"')}`;
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
          content: 'You are an expert educational content creator specializing in creating engaging, addictive learning experiences. Return ONLY a valid JSON object with proper string escaping. NO markdown code blocks.'
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
    .replace(/```json\s*|\s*```/g, '') // Remove code blocks
    .replace(/[\u2018\u2019]/g, "'")   // Replace smart quotes
    .replace(/[\u201C\u201D]/g, '"')   // Replace smart double quotes
    .trim();
};

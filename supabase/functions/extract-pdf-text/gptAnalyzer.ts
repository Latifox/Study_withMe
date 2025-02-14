
interface SegmentContent {
  title: string;
  content: {
    theory_slide_1: string;
    theory_slide_2: string;
    quiz_question_1: {
      type: "multiple_choice";
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    };
    quiz_question_2: {
      type: "true_false";
      question: string;
      correctAnswer: boolean;
      explanation: string;
    };
  };
}

export async function analyzeTextWithGPT(text: string): Promise<{ segments: SegmentContent[] }> {
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
            content: `You are an expert at analyzing academic text and creating educational content.
            Analyze the provided text and break it into 4-6 logical segments. For each segment, create:
            1. A clear, concise title
            2. Two theory slides that explain key concepts
            3. Two quiz questions to test understanding:
               - One multiple choice question with 4 options
               - One true/false question
            
            Structure your response as a JSON array of segments, each containing:
            {
              "title": "segment title",
              "content": {
                "theory_slide_1": "markdown text explaining first concept",
                "theory_slide_2": "markdown text explaining second concept",
                "quiz_question_1": {
                  "type": "multiple_choice",
                  "question": "question text",
                  "options": ["option1", "option2", "option3", "option4"],
                  "correctAnswer": "exact text of correct option",
                  "explanation": "why this is correct"
                },
                "quiz_question_2": {
                  "type": "true_false",
                  "question": "true/false question text",
                  "correctAnswer": boolean,
                  "explanation": "why this is true or false"
                }
              }
            }
            
            Guidelines:
            - Make all content directly relevant to the lecture material
            - Keep theory slides concise but informative
            - Ensure quiz questions test understanding, not just recall
            - Write clear, unambiguous questions
            - Include proper markdown formatting including headers, lists, and emphasis
            - For math content, use LaTeX notation wrapped in $ or $$ symbols`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Validate the response structure
    if (!result.segments || !Array.isArray(result.segments)) {
      throw new Error('Invalid response format from GPT');
    }

    console.log('GPT Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error in analyzeTextWithGPT:', error);
    throw error;
  }
}

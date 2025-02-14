
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
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing academic text and creating educational content.
            Analyze the text and break it into 4-6 logical segments. For each segment:
            1. Create a clear, concise title
            2. Create two theory slides based on the content
            3. Create two quiz questions (one multiple choice, one true/false)
            
            Return a JSON array of segments, each containing:
            - title: clear and descriptive
            - content: containing theory slides and quiz questions
            
            Guidelines:
            - Each segment should cover a distinct topic
            - Theory slides should be based on the actual lecture content
            - Quiz questions must test understanding of the content
            - Ensure logical progression of topics
            - Keep all content factual and derived from the lecture text`
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
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Error in analyzeTextWithGPT:', error);
    throw error;
  }
}

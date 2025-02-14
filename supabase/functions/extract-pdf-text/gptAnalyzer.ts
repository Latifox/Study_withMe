
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
    console.log('Starting GPT analysis with text length:', text.length);

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
            Your task is to break the provided text into 4-6 logical segments and create educational content for each.

            For each segment you MUST create:
            1. A descriptive title summarizing the main topic
            2. Two theory slides explaining the key concepts
            3. Two quiz questions:
               - One multiple choice with exactly 4 options
               - One true/false question

            Output format MUST be exactly:
            {
              "segments": [
                {
                  "title": "string",
                  "content": {
                    "theory_slide_1": "string with markdown",
                    "theory_slide_2": "string with markdown",
                    "quiz_question_1": {
                      "type": "multiple_choice",
                      "question": "string",
                      "options": ["string", "string", "string", "string"],
                      "correctAnswer": "string (must match one of the options exactly)",
                      "explanation": "string"
                    },
                    "quiz_question_2": {
                      "type": "true_false",
                      "question": "string",
                      "correctAnswer": boolean,
                      "explanation": "string"
                    }
                  }
                }
              ]
            }`
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
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Raw GPT response:', JSON.stringify(data, null, 2));

    const result = JSON.parse(data.choices[0].message.content);
    console.log('Parsed GPT response:', JSON.stringify(result, null, 2));

    // Validate response structure
    if (!result.segments || !Array.isArray(result.segments)) {
      throw new Error('Invalid response format: missing segments array');
    }

    // Validate each segment
    result.segments.forEach((segment: any, index: number) => {
      if (!segment.title || typeof segment.title !== 'string') {
        throw new Error(`Invalid title in segment ${index}`);
      }
      if (!segment.content) {
        throw new Error(`Missing content in segment ${index}`);
      }
      if (!segment.content.theory_slide_1 || !segment.content.theory_slide_2) {
        throw new Error(`Missing theory slides in segment ${index}`);
      }
      if (!segment.content.quiz_question_1 || !segment.content.quiz_question_2) {
        throw new Error(`Missing quiz questions in segment ${index}`);
      }
      if (!Array.isArray(segment.content.quiz_question_1.options) || 
          segment.content.quiz_question_1.options.length !== 4) {
        throw new Error(`Invalid options array in segment ${index}`);
      }
    });

    return result;
  } catch (error) {
    console.error('Error in analyzeTextWithGPT:', error);
    throw error;
  }
}

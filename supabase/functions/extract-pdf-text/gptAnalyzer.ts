
interface SegmentContent {
  title: string;
  content: {
    text: string;
    slides: any[];
    questions: any[];
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
            content: `You are an expert at analyzing academic text and creating meaningful segments.
            For each segment, provide both a title and relevant content.
            Return a JSON array of segments, where each segment has a title and content.
            Important guidelines:
            - Create 4-6 segments total
            - Each segment should cover a distinct topic
            - Content must be directly from the source text
            - Ensure logical progression of topics
            - Maintain academic accuracy and depth`
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

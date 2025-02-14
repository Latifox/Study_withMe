
interface SegmentTitle {
  title: string;
}

export async function analyzeTextWithGPT(text: string): Promise<{ segments: SegmentTitle[] }> {
  try {
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
            content: `You are an expert at analyzing academic text and creating meaningful segments.
            For each segment, provide a clear and concise title.
            Return a JSON array of segments with titles.
            Important guidelines:
            - Create 4-6 segments total
            - Each segment should cover a distinct topic
            - Titles should be clear and descriptive
            - Ensure logical progression of topics
            - Keep titles concise but informative`
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

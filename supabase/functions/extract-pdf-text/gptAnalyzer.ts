
export async function analyzeTextWithGPT(text: string): Promise<any> {
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
            content: `You are an expert at analyzing academic text and identifying key segments. 
You MUST follow these rules PRECISELY:

1. Each segment MUST start with a COMPLETE sentence that begins with a capital letter
2. Each segment MUST end with a COMPLETE sentence ending with a period, exclamation mark, or question mark
3. NEVER break a sentence in half - always include full sentences
4. Each segment should contain multiple complete sentences covering one main topic
5. Segment boundaries must align perfectly with sentence boundaries
6. The first word of each segment must be the first word of a complete sentence
7. The last word of each segment must be the last word of a complete sentence

For the given text:
1. Split it into 8-10 logical segments following the rules above
2. For each segment provide:
   - A clear title describing the main topic
   - The starting word number (must be first word of a complete sentence)
   - The ending word number (must be last word of a complete sentence)
   - Verify that both start and end align with sentence boundaries

Return ONLY a JSON object in this format:
{
  "segments": [
    {
      "segment_number": number,
      "title": string,
      "start_word": number,
      "end_word": number
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

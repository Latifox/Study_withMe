
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
            
RULES FOR TEXT SEGMENTATION:
1. Each segment MUST start with a complete sentence
2. Each segment MUST end with a complete sentence
3. Each segment should contain multiple sentences
4. DO NOT break in the middle of a sentence
5. A complete sentence:
   - Starts with a letter or number
   - Ends with a period, exclamation mark, or question mark
   - Contains at least 3 words
6. Segments should cover related content
7. Try to identify 8-10 logical segments
8. Word numbers must align exactly with sentence boundaries

Return a JSON object in this format:
{
  "segments": [
    {
      "segment_number": number,
      "title": string,
      "start_word": number (first word of first complete sentence),
      "end_word": number (last word of last complete sentence)
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
    const parsedContent = JSON.parse(data.choices[0].message.content);
    console.log('GPT Response:', parsedContent);
    
    if (!parsedContent.segments || !Array.isArray(parsedContent.segments)) {
      throw new Error('Invalid GPT response format - missing segments array');
    }

    // Validate segment structure
    for (const segment of parsedContent.segments) {
      if (!segment.segment_number || !segment.title || !segment.start_word || !segment.end_word) {
        throw new Error('Invalid segment format in GPT response');
      }
    }

    return parsedContent;
  } catch (error) {
    console.error('Error in analyzeTextWithGPT:', error);
    throw error;
  }
}


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function makeOpenAIRequest(openAIApiKey: string, messages: any[], retryCount = 0, maxRetries = 3) {
  try {
    console.log(`Attempting OpenAI request, attempt ${retryCount + 1} of ${maxRetries + 1}`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
      }),
    });

    if (response.status === 429) {
      if (retryCount < maxRetries) {
        // Exponential backoff: wait longer between each retry
        const waitTime = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        console.log(`Rate limited, waiting ${waitTime}ms before retry...`);
        await sleep(waitTime);
        return makeOpenAIRequest(openAIApiKey, messages, retryCount + 1, maxRetries);
      } else {
        throw new Error('Rate limit exceeded after maximum retries');
      }
    }

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    if (error.message.includes('Rate limit') && retryCount < maxRetries) {
      const waitTime = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      console.log(`Error occurred, waiting ${waitTime}ms before retry...`);
      await sleep(waitTime);
      return makeOpenAIRequest(openAIApiKey, messages, retryCount + 1, maxRetries);
    }
    throw error;
  }
}

export async function generateTheoryContent(openAIApiKey: string, segmentTitle: string, segmentDescription: string, lectureContent: string) {
  console.log('Generating theory content for segment:', segmentTitle);
  
  const messages = [
    {
      role: 'system',
      content: 'You are an educational content generator. Generate theory content in JSON format only. Focus on clear, concise explanations.'
    },
    {
      role: 'user',
      content: `Generate theory content for a segment with title "${segmentTitle}" and description "${segmentDescription}". 
      Use this lecture content as reference: "${lectureContent.substring(0, 2000)}..."
      
      Return ONLY a JSON object with the following format:
      {
        "theory_slide_1": "First slide content explaining core concepts",
        "theory_slide_2": "Second slide content with examples and applications"
      }
      
      Keep each slide content concise and focused. Do not include any markdown or special formatting.`
    }
  ];

  const content = await makeOpenAIRequest(openAIApiKey, messages);
  return JSON.parse(content);
}

export async function generateQuizContent(openAIApiKey: string, segmentTitle: string, segmentDescription: string, lectureContent: string) {
  console.log('Generating quiz content for segment:', segmentTitle);

  const messages = [
    {
      role: 'system',
      content: 'You are an educational quiz generator. Generate quiz questions in JSON format only. Focus on testing understanding of key concepts.'
    },
    {
      role: 'user',
      content: `Generate two quiz questions for a segment with title "${segmentTitle}" and description "${segmentDescription}". 
      Use this lecture content as reference: "${lectureContent.substring(0, 2000)}..."
      
      Return ONLY a JSON object with the following format:
      {
        "quiz_1_type": "multiple-choice",
        "quiz_1_question": "Question text",
        "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "quiz_1_correct_answer": "Correct option text",
        "quiz_1_explanation": "Explanation for the correct answer",
        "quiz_2_type": "true-false",
        "quiz_2_question": "Question text",
        "quiz_2_correct_answer": true or false,
        "quiz_2_explanation": "Explanation for the correct answer"
      }`
    }
  ];

  const content = await makeOpenAIRequest(openAIApiKey, messages);
  return JSON.parse(content);
}

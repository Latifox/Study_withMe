
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
      content: 'You are an educational content generator. Please generate theory content in a valid JSON format. Use Markdown syntax for formatting, but do **NOT** include code blocks (no triple backticks or inline backticks). Escape Markdown characters (e.g., "\\#", "\\*", "\\-", etc.) with a backslash (e.g., "\\\\#", "\\\\*", "\\\\-") to ensure the JSON structure remains valid. The content should be readable and appropriately formatted in Markdown style, but ensure the final output is a valid, well-formed JSON object.'
    },
    {
      role: 'user',
      content: `Generate theory content for a segment with title "${segmentTitle}" and description "${segmentDescription}". 
      Use this lecture content as your only information source: "${lectureContent}"
      
      Return ONLY a JSON object with the following format:
      {
        "theory_slide_1": "First slide content explaining core concepts",
        "theory_slide_2": "Second slide content with examples and applications"
      }
      
      Keep each slide content concise and focused. Include markdown format for bold, lists, bullet points, quotes, italics etc.
      Please generate the segment content using Markdown formatting (e.g., # for headings, ** for bold, * for italics, and - for lists), but escape all Markdown symbols (e.g., # should be \\#, * should be \\*, etc.) so they don't interfere with JSON parsing. The output should be in a plain JSON format and include escaped Markdown syntax for readability. Use this lecture content as your only information source: "${lectureContent}"`
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

// This is the main function that the index.ts file is trying to import
export async function generateSegmentContent({ segmentTitle, segmentDescription, lectureContent, contentLanguage = 'english' }) {
  console.log('Starting segment content generation for:', segmentTitle);
  console.log('Content language:', contentLanguage);
  
  // Get OpenAI API key from environment variable
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  try {
    // Generate theory content
    console.log('Generating theory content...');
    const theoryContent = await generateTheoryContent(openAIApiKey, segmentTitle, segmentDescription, lectureContent);
    
    // Generate quiz content
    console.log('Generating quiz content...');
    const quizContent = await generateQuizContent(openAIApiKey, segmentTitle, segmentDescription, lectureContent);
    
    // Combine the results
    console.log('Content generation completed successfully');
    return {
      ...theoryContent,
      ...quizContent
    };
  } catch (error) {
    console.error('Error generating segment content:', error);
    throw error;
  }
}

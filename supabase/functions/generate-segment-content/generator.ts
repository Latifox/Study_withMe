
import { SegmentContentRequest, AIConfig } from "./types.ts";
import { getAIConfig } from "./db.ts";

export async function generateSegmentContent(request: SegmentContentRequest) {
  try {
    const { 
      lectureId, 
      segmentTitle, 
      segmentDescription, 
      lectureContent,
      contentLanguage
    } = request;
    
    console.log('Fetching AI configuration for lecture', lectureId);
    
    // Get AI config or use defaults
    const aiConfig = await getAIConfig(lectureId) || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      content_language: contentLanguage || 'English',
      custom_instructions: ''
    };
    
    console.log('Using AI config:', aiConfig);
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return { 
        content: null, 
        error: 'OpenAI API key not found' 
      };
    }
    
    // Create the prompt for OpenAI
    const systemPrompt = createSystemPrompt(aiConfig);
    const userPrompt = createUserPrompt(request, aiConfig);
    
    console.log('Sending request to OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: aiConfig.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return { 
        content: null, 
        error: `OpenAI API error: ${response.status}` 
      };
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      return { 
        content: null, 
        error: 'Invalid response from OpenAI' 
      };
    }
    
    // Process the content
    const content = data.choices[0].message.content.trim();
    console.log('Generated content length:', content.length);
    
    return { content, error: null };
    
  } catch (error) {
    console.error('Error generating content:', error);
    return { 
      content: null, 
      error: `Content generation failed: ${error.message}` 
    };
  }
}

function createSystemPrompt(aiConfig: AIConfig) {
  return `You are an expert educational content creator, tasked with creating detailed, accurate, and engaging 
educational content. Your goal is to explain concepts clearly with examples that aid understanding.

Content Preferences:
- Detail level: ${aiConfig.detail_level > 0.7 ? 'very detailed' : aiConfig.detail_level > 0.3 ? 'moderately detailed' : 'concise'}
- Creativity: ${aiConfig.creativity_level > 0.7 ? 'highly creative' : aiConfig.creativity_level > 0.3 ? 'moderately creative' : 'straightforward'}
- Language: ${aiConfig.content_language || 'English'}
${aiConfig.custom_instructions ? `\nAdditional instructions: ${aiConfig.custom_instructions}` : ''}`;
}

function createUserPrompt(request: SegmentContentRequest, aiConfig: AIConfig) {
  const { 
    segmentTitle, 
    segmentDescription, 
    lectureContent 
  } = request;
  
  // Calculate appropriate length based on detail level
  const targetLength = aiConfig.detail_level > 0.7 ? 'about 1000-1500 words' : 
                        aiConfig.detail_level > 0.3 ? 'about 600-900 words' : 
                        'about 400-600 words';
  
  return `Create educational content for a segment titled "${segmentTitle}". 
This segment covers: ${segmentDescription}

The content should be ${targetLength} and should explain the concepts thoroughly with examples. 
Focus on clarity and accuracy. Use the following lecture content as reference:

${lectureContent}

Format your response as follows:
1. Start with a brief introduction to the topic
2. Explain the key concepts in detail
3. Include examples where appropriate
4. Add a brief conclusion or summary

Use Markdown formatting for headings, bullet points, etc. to make the content more readable.`;
}


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
const searchApiKey = Deno.env.get('GOOGLE_SEARCH_API_KEY');
const searchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, description = '', language = 'english' } = await req.json();
    console.log(`Generating resources for topic: "${topic}" with description: "${description}" in ${language}`);

    if (!googleApiKey || !searchApiKey || !searchEngineId) {
      throw new Error('Google API credentials not configured');
    }

    // Call Gemini API with the search tool configuration
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${googleApiKey}`
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an educational resource curator specializing in academic content. Generate EXACTLY 6 high-quality educational resources about the topic "${topic}" in ${language}.

Context about the topic:
${description}

STRICT REQUIREMENTS:

1. Resource Distribution (EXACTLY):
   - 2 video lectures/tutorials from reputable educational sources
   - 2 academic articles/press material
   - 2 research papers or academic publications

2. Resource Quality Requirements:
   Videos (MUST follow ALL these rules):
   - NO entertainment videos, music, or non-educational content
   - MUST be directly related to "${topic}" and its description
   - MUST be from: youtube.com 
   - Each URL must be unique and functional
   
   Articles (MUST follow ALL these rules)
   - MUST be directly related to "${topic}" and its description
   - MUST be accessible without subscription
   - NO opinion pieces or blog posts
   - Each URL must be unique and functional
   
   Research Papers (MUST follow ALL these rules):
   - ONLY links to Google Scholar
   - MUST be directly related to "${topic}" and its description
   - Prefer open-access papers
   - Each URL must be unique and functional

3. Format Requirements:
   - Use markdown list format
   - Each resource MUST have a clear, descriptive title
   - URLs MUST be real and functional
   - Descriptions MUST explain the specific relevance to "${topic}"

Please format your response exactly as shown below:

## Video Resources
1. [Complete Video Title](video_url)
   Description: Clear explanation of how this video specifically addresses ${topic}

2. [Complete Video Title](video_url)
   Description: Clear explanation of how this video specifically addresses ${topic}

## Article Resources
1. [Complete Article Title](article_url)
   Description: Clear explanation of how this article specifically addresses ${topic}

2. [Complete Article Title](article_url)
   Description: Clear explanation of how this article specifically addresses ${topic}

## Research Papers
1. [Complete Paper Title](paper_url)
   Description: Clear explanation of how this paper specifically addresses ${topic}

2. [Complete Paper Title](paper_url)
   Description: Clear explanation of how this paper specifically addresses ${topic}`
          }]
        }],
        tools: [{
          function_declarations: [{
            name: "search",
            description: "Search for information",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query"
                }
              },
              required: ["query"]
            }
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
      })
    });

    if (!geminiResponse.ok) {
      console.error(`Gemini API error: ${geminiResponse.status}`);
      const errorData = await geminiResponse.json();
      console.error('Gemini API error details:', errorData);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response:', JSON.stringify(geminiData, null, 2));
    
    // Extract the generated content
    const markdown = geminiData.candidates[0].content.parts[0].text;
    
    // Log the grounding metadata if available
    if (geminiData.candidates[0].groundingMetadata?.searchEntryPoint?.renderedContent) {
      console.log('Search results used:', 
        geminiData.candidates[0].groundingMetadata.searchEntryPoint.renderedContent
      );
    }
    
    return new Response(
      JSON.stringify({ markdown }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-resources function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

console.log("Loading generate-resources function...");

serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Get the request body
    const requestData = await req.json();
    console.log('Request data:', requestData);

    const { topic, description = '' } = requestData;
    
    if (!topic) {
      throw new Error('No topic provided');
    }
    
    console.log(`Generating resources for topic: "${topic}" with description: "${description}" in english`);

    const messages = [
      {
        role: "system",
        content: `You are an educational resource curator. Your task is to suggest high-quality learning resources for specific topics. Focus on variety and credibility. Format your response in valid JSON with markdown for display and structured data for storage.

        Guidelines:
        - Include a mix of resource types (articles, videos, interactive tools, etc.)
        - Ensure all URLs are valid and from reputable sources
        - Provide a brief description for each resource
        - Group resources by type
        - Maximum 3-4 resources per type
        - Keep descriptions concise but informative`
      },
      {
        role: "user",
        content: `Please suggest learning resources for the topic "${topic}". Additional context: ${description}

        Return the response in this format:
        {
          "markdown": "formatted markdown for display",
          "resources": [
            {
              "resource_type": "video|article|interactive|tutorial",
              "title": "resource title",
              "url": "resource url",
              "description": "brief description"
            }
          ]
        }`
      }
    ];

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

    console.log('Sending request to Perplexity API...');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: messages,
        temperature: 0.1,
        max_tokens: 2048,
        return_images: false,
        stream: false,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Perplexity API error:', error);
      throw new Error(`Perplexity API error: ${error}`);
    }

    const result = await response.json();
    console.log('Perplexity API response:', result);

    let parsedContent;
    try {
      parsedContent = JSON.parse(result.choices[0].message.content);
      console.log('Parsed content:', parsedContent);
    } catch (error) {
      console.error('Error parsing Perplexity response:', error);
      throw new Error('Invalid response format from Perplexity API');
    }

    // Return the response with CORS headers
    return new Response(
      JSON.stringify(parsedContent),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Error in generate-resources function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
});


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

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
    console.log('Starting generate-resources function');
    const { topic, description } = await req.json();
    console.log('Received request with:', { topic, description });

    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY is not set');
    }

    const prompt = `Generate a set of high-quality educational resources for learning about "${topic}". 
    Context about the topic: ${description}
    
    Return the response in this exact JSON format:
    {
      "resources": [
        {
          "title": "Resource title",
          "url": "URL to the resource",
          "description": "Brief description of the resource",
          "resource_type": "video|article|tutorial|book|course"
        }
      ]
    }
    
    Include 2-3 resources of each type that are most relevant. Focus on reputable sources.`;

    console.log('Sending request to Perplexity API');
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that suggests high-quality learning resources. Be precise and specific in your recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      }),
    });

    console.log('Received response from Perplexity API');
    const data = await response.json();
    console.log('Perplexity API response:', data);

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from Perplexity API');
    }

    // Parse the JSON response from the content
    const generatedContent = JSON.parse(data.choices[0].message.content);
    console.log('Parsed generated content:', generatedContent);

    // Convert resources to markdown format
    const resourcesByType: { [key: string]: any[] } = {};
    generatedContent.resources.forEach((resource: any) => {
      if (!resourcesByType[resource.resource_type]) {
        resourcesByType[resource.resource_type] = [];
      }
      resourcesByType[resource.resource_type].push(resource);
    });

    let markdown = "## Additional Learning Resources\n\n";
    Object.entries(resourcesByType).forEach(([type, resources]) => {
      markdown += `### ${type.charAt(0).toUpperCase() + type.slice(1)}s\n\n`;
      resources.forEach((resource: any) => {
        markdown += `- [${resource.title}](${resource.url})\n  ${resource.description}\n\n`;
      });
    });

    console.log('Generated markdown:', markdown);

    return new Response(
      JSON.stringify({
        resources: generatedContent.resources,
        markdown: markdown
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
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
          'Content-Type': 'application/json'
        }
      }
    );
  }
});


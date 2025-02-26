
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Resource {
  title: string;
  url: string;
  description: string;
  resource_type: string;
}

serve(async (req) => {
  console.log('Generate resources function started');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!perplexityApiKey) {
      console.error('PERPLEXITY_API_KEY is not set');
      throw new Error('PERPLEXITY_API_KEY is not set');
    }

    const { topic, description } = await req.json();
    console.log('Received request for topic:', topic);

    const prompt = `Generate a curated list of 6-8 high-quality educational resources for learning about "${topic}". 
    Context about the topic: ${description}
    
    Return the response in this exact JSON format:
    {
      "resources": [
        {
          "title": "Resource title",
          "url": "URL to the resource",
          "description": "Brief description of why this resource is valuable",
          "resource_type": "video|article|tutorial|book|course"
        }
      ]
    }
    
    Include a mix of different resource types. Focus on reputable sources like educational platforms, respected publications, and well-known experts.`;

    console.log('Sending request to Perplexity API');
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-2-70b-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that suggests high-quality learning resources.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Perplexity API error:', await response.text());
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received response from Perplexity API');

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Perplexity API');
    }

    // Parse the JSON string from the content
    let parsedResources;
    try {
      parsedResources = JSON.parse(data.choices[0].message.content);
      console.log('Successfully parsed resources:', parsedResources);
    } catch (error) {
      console.error('Error parsing Perplexity response:', error);
      throw new Error('Failed to parse Perplexity response');
    }

    // Convert resources to markdown
    let markdown = "## Additional Learning Resources\n\n";
    const resourcesByType: { [key: string]: Resource[] } = {};

    // Group resources by type
    parsedResources.resources.forEach((resource: Resource) => {
      if (!resourcesByType[resource.resource_type]) {
        resourcesByType[resource.resource_type] = [];
      }
      resourcesByType[resource.resource_type].push(resource);
    });

    // Generate markdown sections by type
    Object.entries(resourcesByType).forEach(([type, resources]) => {
      markdown += `### ${type.charAt(0).toUpperCase() + type.slice(1)}s\n\n`;
      resources.forEach(resource => {
        markdown += `- [${resource.title}](${resource.url})\n  ${resource.description}\n\n`;
      });
    });

    console.log('Returning generated content');
    return new Response(
      JSON.stringify({
        resources: parsedResources.resources,
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

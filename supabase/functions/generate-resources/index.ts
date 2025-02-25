
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Resource {
  type: 'video' | 'article' | 'research';
  title: string;
  url: string;
  description: string;
}

function extractJSONFromString(str: string): string {
  // Find the first '[' and last ']' to extract the JSON array
  const start = str.indexOf('[');
  const end = str.lastIndexOf(']') + 1;
  
  if (start === -1 || end === 0) {
    console.error('No JSON array found in string:', str);
    throw new Error('No valid JSON array found in response');
  }
  
  // Extract the potential JSON string
  let jsonString = str.slice(start, end);
  
  // Remove any markdown code block markers
  jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '');
  
  // Clean up common JSON formatting issues
  jsonString = jsonString
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    .replace(/\n/g, '') // Remove newlines
    .replace(/\r/g, '') // Remove carriage returns
    .trim();
    
  return jsonString;
}

function isValidResource(resource: any): resource is Resource {
  const validTypes = ['video', 'article', 'research'];
  
  if (!resource || typeof resource !== 'object') return false;
  
  // Basic structure validation
  const hasValidStructure = 
    validTypes.includes(resource.type) &&
    typeof resource.title === 'string' &&
    typeof resource.url === 'string' &&
    typeof resource.description === 'string';

  if (!hasValidStructure) return false;

  // URL validation
  try {
    new URL(resource.url);
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, language = 'spanish' } = await req.json();
    
    console.log(`Generating resources for topic: ${topic} in ${language}`);
    
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

    const systemPrompt = `You are an educational resource curator who returns ONLY a JSON array containing exactly 9 resources about "${topic}" in ${language}:
- Exactly 3 video resources from YouTube, Coursera, or edX
- Exactly 3 article resources from educational websites or blogs
- Exactly 3 research papers from academic repositories

STRICT FORMAT REQUIREMENTS:
1. Return ONLY a JSON array with exactly 9 items
2. Each item must follow this exact format:
{
  "type": "video"|"article"|"research",
  "title": "Resource Title",
  "url": "https://valid-url.com",
  "description": "Brief description"
}
3. ONLY include real, working URLs
4. ALL content must be in ${language}
5. Each URL must be unique
6. NO explanatory text, ONLY the JSON array`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Return educational resources about: ${topic}` }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        top_p: 0.9,
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status} ${response.statusText}`);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid response format from Perplexity:', data);
      throw new Error('Invalid response format from Perplexity');
    }

    console.log('Raw response from Perplexity:', data.choices[0].message.content);

    try {
      const jsonString = extractJSONFromString(data.choices[0].message.content);
      console.log('Extracted JSON string:', jsonString);
      
      const resources = JSON.parse(jsonString);
      
      if (!Array.isArray(resources)) {
        console.error('Parsed result is not an array:', resources);
        throw new Error('Generated content is not a valid array');
      }

      // Validate each resource
      const validatedResources = resources.filter(isValidResource);
      
      if (validatedResources.length !== 9) {
        console.error(`Invalid number of resources generated: ${validatedResources.length}`);
        throw new Error('Incorrect number of resources generated');
      }

      // Verify we have exactly 3 of each type
      const counts = validatedResources.reduce((acc: Record<string, number>, resource) => {
        acc[resource.type] = (acc[resource.type] || 0) + 1;
        return acc;
      }, {});

      if (counts.video !== 3 || counts.article !== 3 || counts.research !== 3) {
        console.error('Invalid distribution of resource types:', counts);
        throw new Error('Incorrect distribution of resource types');
      }

      // Verify all URLs are unique
      const urls = new Set(validatedResources.map(r => r.url));
      if (urls.size !== validatedResources.length) {
        throw new Error('Duplicate URLs found in resources');
      }

      console.log(`Successfully generated ${validatedResources.length} resources for topic: ${topic}`);
      
      return new Response(
        JSON.stringify([{ concept: topic, resources: validatedResources }]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error processing Perplexity response:', error);
      console.error('Raw content that caused the error:', data.choices[0].message.content);
      throw new Error(`Failed to process Perplexity response: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in generate-resources function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

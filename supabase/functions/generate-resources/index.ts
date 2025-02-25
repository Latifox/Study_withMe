
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
  const start = str.indexOf('[');
  const end = str.lastIndexOf(']') + 1;
  
  if (start === -1 || end === 0) {
    console.error('No JSON array found in string:', str);
    throw new Error('No valid JSON array found in response');
  }
  
  let jsonString = str.slice(start, end);
  jsonString = jsonString
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .trim();
    
  return jsonString;
}

function isValidResource(resource: any): resource is Resource {
  const validTypes = ['video', 'article', 'research'];
  
  if (!resource || typeof resource !== 'object') return false;
  
  const hasValidStructure = 
    validTypes.includes(resource.type) &&
    typeof resource.title === 'string' &&
    typeof resource.url === 'string' &&
    typeof resource.description === 'string';

  if (!hasValidStructure) return false;

  try {
    new URL(resource.url);
    return true;
  } catch {
    return false;
  }
}

function enforceResourceDistribution(resources: Resource[]): Resource[] {
  const groupedResources: Record<string, Resource[]> = {
    video: [],
    article: [],
    research: []
  };

  // Group valid resources by type
  resources.forEach(resource => {
    if (isValidResource(resource)) {
      groupedResources[resource.type].push(resource);
    }
  });

  // Take exactly 3 resources of each type, or throw if we don't have enough
  const finalResources: Resource[] = [];
  for (const type of ['video', 'article', 'research'] as const) {
    if (groupedResources[type].length < 3) {
      console.error(`Not enough ${type} resources: ${groupedResources[type].length}`);
      throw new Error(`Insufficient ${type} resources generated`);
    }
    finalResources.push(...groupedResources[type].slice(0, 3));
  }

  return finalResources;
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

    const systemPrompt = `You are an educational resource curator who returns ONLY a JSON array containing exactly 9 educational resources about "${topic}" in ${language}:
- Exactly 3 video resources from YouTube, Coursera, or edX
- Exactly 3 article resources from educational websites or blogs
- Exactly 3 research papers from academic repositories

STRICT REQUIREMENTS:
1. Return ONLY a JSON array with EXACTLY 9 items
2. Each item must follow this exact format:
{
  "type": "video"|"article"|"research",
  "title": "Resource Title",
  "url": "https://valid-url.com",
  "description": "Brief description"
}
3. ALL URLs must be real and valid
4. ALL content must be in ${language}
5. Each URL must be unique
6. NO explanatory text, ONLY the JSON array`;

    const maxRetries = 3;
    let resources: Resource[] = [];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to generate valid resources`);
        
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
              { role: 'user', content: `Return exactly 9 educational resources about: ${topic}` }
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

        const jsonString = extractJSONFromString(data.choices[0].message.content);
        const parsedResources = JSON.parse(jsonString);
        
        if (!Array.isArray(parsedResources)) {
          console.error('Parsed result is not an array:', parsedResources);
          throw new Error('Generated content is not a valid array');
        }

        // Try to enforce resource distribution
        resources = enforceResourceDistribution(parsedResources);
        console.log(`Successfully generated ${resources.length} resources with correct distribution`);
        break;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw new Error(`Failed to generate valid resources after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify([{ concept: topic, resources: resources }]),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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

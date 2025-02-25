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

function sanitizeJSON(content: string): string {
  // Step 1: Find JSON array pattern
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON array found in response');
  }

  // Step 2: Extract and clean the JSON string
  let jsonStr = jsonMatch[0];
  
  // Step 3: Remove any markdown code block syntax
  jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Step 4: Fix all types of quotes in property names and values
  jsonStr = jsonStr
    // First, standardize all quotes to single quotes
    .replace(/[\u2018\u2019\u201C\u201D"]/g, "'")
    // Then, ensure property names use double quotes (matches 'property': or 'property' :)
    .replace(/'([^']+)'(\s*:)/g, '"$1"$2')
    // Keep string values in single quotes
    .replace(/:\s*'([^']*?)'/g, ': "$1"')
    .replace(/\\/g, '\\\\') // Escape backslashes
    .trim();

  console.log('Sanitized JSON:', jsonStr);
  return jsonStr;
}

function isValidResource(resource: any): resource is Resource {
  return (
    resource &&
    typeof resource === 'object' &&
    ['video', 'article', 'research'].includes(resource.type) &&
    typeof resource.title === 'string' &&
    typeof resource.url === 'string' &&
    typeof resource.description === 'string' &&
    resource.title.length > 0 &&
    resource.description.length > 0 &&
    (resource.url.startsWith('http://') || resource.url.startsWith('https://'))
  );
}

async function generateResources(topic: string, language: string = 'english'): Promise<Resource[]> {
  console.log(`Generating resources for topic: ${topic} in ${language}`);
  
  if (!perplexityApiKey) {
    throw new Error('Perplexity API key not configured');
  }
  
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
          content: `You are an AI that only outputs valid JSON arrays containing educational resources.
          Generate exactly 9 resources (3 videos, 3 articles, 3 research papers).
          
          Rules:
          1. Videos must be from: YouTube, Coursera, or edX
          2. Articles must be from: Medium, Dev.to, Wikipedia, or academic platforms
          3. Research must be from: arXiv, ResearchGate, or academic journals
          4. All text must be in ${language}
          5. URLs must be real and start with http:// or https://
          6. Resources must be relevant to: ${topic}
          
          IMPORTANT: Your ENTIRE response must be ONLY a JSON array with double quotes for property names:
          [{"type": "video","title": "Example","url": "https://...","description": "Text"}]`
        },
        {
          role: 'user',
          content: `Generate a JSON array of 9 educational resources about: ${topic}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
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
    throw new Error('Invalid response format from Perplexity');
  }

  console.log('Raw Perplexity response:', data.choices[0].message.content);

  let resources: Resource[];
  try {
    const sanitizedJSON = sanitizeJSON(data.choices[0].message.content);
    console.log('Sanitized JSON:', sanitizedJSON);
    
    resources = JSON.parse(sanitizedJSON);
    
    if (!Array.isArray(resources)) {
      console.error('Parsed result is not an array:', resources);
      throw new Error('Generated content is not a valid array');
    }
  } catch (error) {
    console.error('JSON parsing error:', error);
    console.error('Attempted to parse:', data.choices[0].message.content);
    throw new Error(`Failed to parse resources: ${error.message}`);
  }

  // Validate each resource
  const validatedResources = resources.filter(isValidResource);
  
  if (validatedResources.length < 3) {
    console.error('Not enough valid resources:', validatedResources);
    throw new Error('Not enough valid resources generated');
  }

  console.log(`Successfully generated ${validatedResources.length} resources`);
  return validatedResources;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureContent, aiConfig, segmentTitles } = await req.json();
    
    console.log('Processing request:', {
      contentLength: lectureContent?.length || 0,
      aiConfig,
      segmentCount: segmentTitles?.length,
    });

    if (!lectureContent) {
      throw new Error('Missing lecture content');
    }
    if (!segmentTitles || !Array.isArray(segmentTitles) || segmentTitles.length === 0) {
      throw new Error('Invalid or empty segment titles');
    }

    const language = aiConfig?.content_language || 'english';
    
    const resourcePromises = segmentTitles.map(async (title) => {
      try {
        const resources = await generateResources(title, language);
        return {
          concept: title,
          resources: resources
        };
      } catch (error) {
        console.error(`Error generating resources for segment "${title}":`, error);
        throw error;
      }
    });
    
    const allResources = await Promise.all(resourcePromises);
    console.log('Successfully generated all resources');

    return new Response(JSON.stringify(allResources), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error('Error in generate-resources function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

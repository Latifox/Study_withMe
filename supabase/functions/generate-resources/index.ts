
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

async function validateUrl(url: string, type: string): Promise<boolean> {
  try {
    const validDomains = {
      video: ['youtube.com', 'youtu.be', 'vimeo.com', 'coursera.org', 'edx.org'],
      article: ['medium.com', 'dev.to', 'wikipedia.org', 'edx.org', 'coursera.org', 'researchgate.net'],
      research: ['arxiv.org', 'researchgate.net', 'sciencedirect.com', 'springer.com', 'ieee.org', 'acm.org']
    };

    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');

    // Check if the domain is in the whitelist for the specific type
    const isValidDomain = validDomains[type as keyof typeof validDomains]?.some(d => domain.includes(d));
    if (!isValidDomain) {
      console.warn(`Domain ${domain} not in whitelist for type ${type}`);
      return false;
    }

    // Skip HEAD request for known reliable domains
    const reliableDomains = ['youtube.com', 'youtu.be', 'arxiv.org'];
    if (reliableDomains.some(d => domain.includes(d))) {
      return true;
    }

    // For other domains, verify the URL is accessible
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ResourceBot/1.0;)'
      }
    });
    return response.status === 200;
  } catch (error) {
    console.error(`Error validating URL ${url}:`, error);
    return false;
  }
}

function cleanLLMResponse(content: string): string {
  return content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
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
    resource.url.length > 0 &&
    resource.description.length > 0 &&
    (resource.url.startsWith('http://') || resource.url.startsWith('https://'))
  );
}

async function generateResources(topic: string, language: string = 'english', retryCount: number = 0): Promise<Resource[]> {
  console.log(`Generating resources for topic: ${topic} in ${language}, attempt ${retryCount + 1}`);
  
  if (retryCount >= 3) {
    throw new Error('Max retry attempts reached');
  }
  
  try {
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
            content: `You are a helpful assistant that provides specific, direct links to educational resources in ${language}. Generate 9 resources (3 videos, 3 articles, 3 research papers) about the given topic.
            
            STRICT RULES for generating URLs:
            1. For videos: ONLY use URLs from:
               - youtube.com/watch?v=
               - youtu.be/
               - coursera.org (course videos)
               - edx.org (course videos)
            2. For articles: ONLY use URLs from:
               - medium.com (technical articles)
               - dev.to (programming tutorials)
               - wikipedia.org (general knowledge)
               - edx.org (course content)
               - coursera.org (course content)
            3. For research: ONLY use URLs from:
               - arxiv.org (papers)
               - researchgate.net (papers)
               - sciencedirect.com (papers)
               - springer.com (papers)
               - ieee.org (papers)
               - acm.org (papers)
            4. NO search result pages or category pages
            5. ALL descriptions must be in ${language}
            6. Use REAL, EXISTING URLs - do not generate fake ones
            7. Make sure resources are specific and relevant to ${topic}
            
            Provide your response in this exact JSON format:
            [
              {"type": "video", "title": "title1", "url": "url1", "description": "desc1"},
              ...
            ]`
          },
          {
            role: 'user',
            content: `Generate verified educational resources about: ${topic}`
          }
        ],
        temperature: 0.2,
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

    let resources: Resource[];
    try {
      const content = cleanLLMResponse(data.choices[0].message.content);
      resources = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse Perplexity response:', error);
      return generateResources(topic, language, retryCount + 1);
    }

    if (!Array.isArray(resources)) {
      console.error('Invalid resources format: expected array');
      return generateResources(topic, language, retryCount + 1);
    }

    const validatedResources: Resource[] = [];
    
    for (const resource of resources) {
      if (isValidResource(resource)) {
        const isUrlValid = await validateUrl(resource.url, resource.type);
        if (isUrlValid) {
          validatedResources.push(resource);
        } else {
          console.warn(`Invalid URL for resource: ${resource.url}`);
        }
      } else {
        console.warn('Invalid resource structure:', resource);
      }
    }

    if (validatedResources.length < 3) {
      console.log('Not enough valid resources, retrying...');
      return generateResources(topic, language, retryCount + 1);
    }

    console.log('Successfully generated resources:', validatedResources);
    return validatedResources;
  } catch (error) {
    console.error('Error in generateResources:', error);
    if (retryCount < 2) {
      console.log('Retrying resource generation...');
      return generateResources(topic, language, retryCount + 1);
    }
    throw error;
  }
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
    console.log('Completed resource generation');

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

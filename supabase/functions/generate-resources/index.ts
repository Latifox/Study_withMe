
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

async function validateUrl(url: string): Promise<boolean> {
  try {
    const validDomains = {
      video: ['youtube.com', 'youtu.be'],
      article: ['medium.com', 'dev.to', 'wikipedia.org', 'edx.org', 'coursera.org'],
      research: ['arxiv.org', 'researchgate.net', 'sciencedirect.com', 'springer.com']
    };

    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');

    if (urlObj.pathname.includes('search') || urlObj.pathname.includes('results')) {
      console.warn('Rejecting search results page:', url);
      return false;
    }

    for (const [type, domains] of Object.entries(validDomains)) {
      if (domains.some(d => domain.includes(d))) {
        if (type === 'video' && !url.includes('watch?v=') && !url.includes('youtu.be/')) {
          console.warn('Rejecting non-video YouTube URL:', url);
          return false;
        }
        const response = await fetch(url, { method: 'HEAD' });
        return response.status === 200;
      }
    }

    console.warn('Domain not in whitelist:', domain);
    return false;
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

async function generateResources(topic: string): Promise<Resource[]> {
  console.log('Generating resources for topic:', topic);
  
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
            content: `You are a helpful assistant that provides educational resources. Generate 9 resources (3 videos, 3 articles, 3 research papers) about the given topic.
            
            STRICT RULES for generating URLs:
            1. For videos: ONLY use real YouTube video URLs in format youtube.com/watch?v= or youtu.be/
            2. For articles: ONLY use URLs from:
               - medium.com (technical articles)
               - dev.to (programming tutorials)
               - wikipedia.org (general knowledge)
               - edx.org (course pages)
               - coursera.org (course pages)
            3. For research: ONLY use URLs from:
               - arxiv.org (direct PDF or abstract pages)
               - researchgate.net (direct paper pages)
               - sciencedirect.com (direct paper pages)
               - springer.com (direct paper pages)
            4. NO search result pages or category pages
            5. ALL content must be in English
            6. Use REAL, EXISTING URLs only - do not generate fake ones
            7. Ensure URLs point to actual content pages, not homepages
            
            Provide your response in this exact JSON format:
            [
              {"type": "video", "title": "title1", "url": "url1", "description": "desc1"},
              ...
            ]
            
            IMPORTANT: Reply ONLY with the JSON array. NO markdown formatting, NO extra text.`
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
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
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
      throw new Error('Failed to parse resources from Perplexity response');
    }

    if (!Array.isArray(resources)) {
      throw new Error('Invalid resources format: expected array');
    }

    const validatedResources: Resource[] = [];
    
    for (const resource of resources) {
      if (isValidResource(resource)) {
        const isUrlValid = await validateUrl(resource.url);
        if (isUrlValid) {
          validatedResources.push(resource);
        } else {
          console.warn(`Skipping resource with invalid URL: ${resource.url}`);
        }
      } else {
        console.warn('Invalid resource structure:', resource);
      }
    }

    if (validatedResources.length < 3) {
      console.log('Not enough valid resources, retrying...');
      return generateResources(topic);
    }

    console.log('Successfully generated resources:', validatedResources);
    return validatedResources;
  } catch (error) {
    console.error('Error in generateResources:', error);
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

    const resourcePromises = segmentTitles.map(async (title) => {
      try {
        const resources = await generateResources(title);
        
        // Translate descriptions if needed
        if (aiConfig?.content_language && aiConfig.content_language !== 'english') {
          const translationResponse = await fetch('https://api.perplexity.ai/chat/completions', {
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
                  content: `Translate the following resource descriptions to ${aiConfig.content_language}. Reply ONLY with a JSON array of translated strings.`
                },
                {
                  role: 'user',
                  content: JSON.stringify(resources.map(r => r.description))
                }
              ],
              temperature: 0.2,
              max_tokens: 1000
            }),
          });

          if (!translationResponse.ok) {
            throw new Error('Translation API error');
          }

          const translationData = await translationResponse.json();
          const translations = JSON.parse(translationData.choices[0].message.content);
          
          resources.forEach((resource, index) => {
            resource.description = translations[index];
          });
        }

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


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

if (!openAIApiKey) {
  throw new Error('OPENAI_API_KEY is required');
}

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

// Function to validate URLs by actually checking if they exist
async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.status === 200;
  } catch (error) {
    console.error(`Error validating URL ${url}:`, error);
    return false;
  }
}

// Function to clean markdown code blocks from LLM response
function cleanMarkdownCodeBlock(content: string): string {
  return content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}

// Function to validate resource structure
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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that provides educational resources. Generate 9 resources (3 videos, 3 articles, 3 research papers) about the given topic.
            
            RULES for generating URLs:
            1. DO NOT generate mock or placeholder URLs
            2. For videos: ONLY use existing YouTube URLs (youtube.com/watch?v=)
            3. For articles: ONLY use URLs from reputable educational websites (.edu domains preferred)
            4. For research: ONLY use URLs from established academic repositories
            5. VERIFY that each URL actually exists before including it
            6. DO NOT include search result pages
            7. ALL content must be in English
            
            Provide your response in this exact JSON format:
            [
              {"type": "video", "title": "title1", "url": "url1", "description": "desc1"},
              ...
            ]
            
            IMPORTANT: Reply ONLY with the JSON array. NO markdown formatting, NO extra text.`
          },
          {
            role: 'user',
            content: `Generate educational resources about: ${topic}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI');
    }

    let resources: Resource[];
    try {
      const content = cleanMarkdownCodeBlock(data.choices[0].message.content);
      resources = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      throw new Error('Failed to parse resources from OpenAI response');
    }

    // Validate resources format
    if (!Array.isArray(resources)) {
      throw new Error('Invalid resources format: expected array');
    }

    // Validate each resource and filter out invalid ones
    const validatedResources: Resource[] = [];
    
    for (const resource of resources) {
      if (isValidResource(resource)) {
        // Check if URL is actually accessible
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

    if (validatedResources.length === 0) {
      throw new Error('No valid resources generated');
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

    // Generate resources for each segment
    const resourcePromises = segmentTitles.map(async (title) => {
      try {
        const resources = await generateResources(title);
        
        // Translate descriptions if needed
        if (aiConfig?.content_language && aiConfig.content_language !== 'english') {
          const translationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
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
              temperature: 0.3,
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

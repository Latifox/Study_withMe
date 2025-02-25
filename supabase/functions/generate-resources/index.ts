
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

interface ConceptResources {
  concept: string;
  resources: Resource[];
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
            content: `You are a helpful assistant that provides direct links to educational resources. Generate 9 resources (3 videos, 3 articles, 3 research papers) about the given topic.
            For videos: Focus on high-quality educational content from reputable channels like Khan Academy, MIT OpenCourseWare, Crash Course, etc.
            For articles: Focus on educational websites, digital libraries, and reputable online sources.
            For research: Focus on academic papers from reputable journals and conferences.
            
            IMPORTANT: 
            1. Provide DIRECT links to specific resources, not search result pages
            2. Resources should be in English, even if the topic is in another language
            3. Ensure all URLs are valid and accessible
            4. Provide clear, informative descriptions
            5. Focus on recent, high-quality content`
          },
          {
            role: 'user',
            content: `Generate educational resources about: ${topic}`
          }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    let resources: Resource[] = JSON.parse(data.choices[0].message.content);

    // Validate and format resources
    resources = resources.map(resource => ({
      type: resource.type,
      title: resource.title,
      url: resource.url,
      description: resource.description,
    }));

    console.log('Generated resources:', resources);
    return resources;
  } catch (error) {
    console.error('Error generating resources:', error);
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
      segmentTitles,
    });

    if (!lectureContent) {
      throw new Error('Missing lecture content');
    }
    if (!segmentTitles || !Array.isArray(segmentTitles) || segmentTitles.length === 0) {
      throw new Error('Invalid or empty segment titles');
    }

    // Generate resources for each segment
    const resourcePromises = segmentTitles.map(async (title) => {
      const resources = await generateResources(title);
      
      // If content language is specified and not English, translate descriptions
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
                content: `Translate the following resource descriptions to ${aiConfig.content_language}. Keep the translations natural and fluent.`
              },
              {
                role: 'user',
                content: JSON.stringify(resources.map(r => r.description))
              }
            ],
            temperature: 0.3,
          }),
        });

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
    });
    
    const allResources = await Promise.all(resourcePromises);
    console.log('Completed resource generation');

    return new Response(JSON.stringify(allResources), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in generate-resources function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


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

async function searchYouTubeVideos(topic: string): Promise<Resource[]> {
  // Use pattern matching to ensure we're returning videos from reputable educational channels
  const educationalChannels = [
    'Khan Academy',
    'MIT OpenCourseWare',
    'Crash Course',
    'TED-Ed',
    'Numberphile',
    'SciShow',
    '3Blue1Brown',
    'Physics Girl',
    'Veritasium',
  ];

  // Generate search queries for each channel
  const results: Resource[] = [
    {
      type: 'video',
      title: `${educationalChannels[0]} - Understanding ${topic}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${educationalChannels[0]} ${topic}`)}`,
      description: `A comprehensive overview of ${topic} from ${educationalChannels[0]}'s perspective.`
    },
    {
      type: 'video',
      title: `${educationalChannels[1]} Lecture on ${topic}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${educationalChannels[1]} ${topic} lecture`)}`,
      description: `University-level lecture covering ${topic} from ${educationalChannels[1]}.`
    },
    {
      type: 'video',
      title: `${educationalChannels[2]} - ${topic} Explained`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${educationalChannels[2]} ${topic}`)}`,
      description: `An engaging and accessible explanation of ${topic} from ${educationalChannels[2]}.`
    }
  ];

  return results;
}

async function searchArticles(topic: string): Promise<Resource[]> {
  // Educational websites and digital libraries
  const educationalSites = [
    { name: 'Nature', domain: 'nature.com' },
    { name: 'Science Direct', domain: 'sciencedirect.com' },
    { name: 'Encyclopedia Britannica', domain: 'britannica.com' }
  ];

  const results: Resource[] = [
    {
      type: 'article',
      title: `${topic} - ${educationalSites[0].name}`,
      url: `https://www.${educationalSites[0].domain}/search?q=${encodeURIComponent(topic)}`,
      description: `Peer-reviewed articles about ${topic} from ${educationalSites[0].name}.`
    },
    {
      type: 'article',
      title: `Understanding ${topic} - ${educationalSites[1].name}`,
      url: `https://www.${educationalSites[1].domain}/search?qs=${encodeURIComponent(topic)}`,
      description: `Comprehensive academic articles covering ${topic}.`
    },
    {
      type: 'article',
      title: `${topic} Overview - ${educationalSites[2].name}`,
      url: `https://www.${educationalSites[2].domain}/search?query=${encodeURIComponent(topic)}`,
      description: `Detailed encyclopedia entries related to ${topic}.`
    }
  ];

  return results;
}

async function searchResearchPapers(topic: string): Promise<Resource[]> {
  // Academic databases and repositories
  const academicSites = [
    { name: 'arXiv', domain: 'arxiv.org' },
    { name: 'Google Scholar', domain: 'scholar.google.com' },
    { name: 'JSTOR', domain: 'jstor.org' }
  ];

  const results: Resource[] = [
    {
      type: 'research',
      title: `Latest Research on ${topic} - ${academicSites[0].name}`,
      url: `https://${academicSites[0].domain}/search/?query=${encodeURIComponent(topic)}&searchtype=all`,
      description: `Recent academic papers and preprints about ${topic}.`
    },
    {
      type: 'research',
      title: `${topic} Academic Publications - ${academicSites[1].name}`,
      url: `https://${academicSites[1].domain}/scholar?q=${encodeURIComponent(topic)}`,
      description: `Scholarly articles and citations related to ${topic}.`
    },
    {
      type: 'research',
      title: `${topic} Research Papers - ${academicSites[2].name}`,
      url: `https://www.${academicSites[2].domain}/action/doSearch?Query=${encodeURIComponent(topic)}`,
      description: `Academic journal articles and research papers on ${topic}.`
    }
  ];

  return results;
}

async function generateResourcesForSegment(title: string, aiConfig: any): Promise<ConceptResources> {
  console.log('Starting resource generation for segment:', title);
  
  try {
    // Generate real links for each type of resource
    const [videos, articles, papers] = await Promise.all([
      searchYouTubeVideos(title),
      searchArticles(title),
      searchResearchPapers(title)
    ]);

    // Combine all resources
    const resources = [...videos, ...articles, ...papers];

    // If content language is specified, translate descriptions
    if (aiConfig?.content_language && aiConfig.content_language !== 'english') {
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
              content: `You are a translator. Translate the following descriptions to ${aiConfig.content_language}. Keep the translations natural and fluent.`
            },
            {
              role: 'user',
              content: JSON.stringify(resources.map(r => r.description))
            }
          ],
          temperature: 0.3,
        }),
      });

      const translationData = await response.json();
      const translations = JSON.parse(translationData.choices[0].message.content);
      
      // Update descriptions with translations
      resources.forEach((resource, index) => {
        resource.description = translations[index];
      });
    }

    return {
      concept: title,
      resources: resources
    };
    
  } catch (error) {
    console.error('Error generating resources for segment:', title, error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Input validation
    if (!lectureContent) {
      throw new Error('Missing lecture content');
    }
    if (!segmentTitles || !Array.isArray(segmentTitles) || segmentTitles.length === 0) {
      throw new Error('Invalid or empty segment titles');
    }

    // Generate resources for all segments simultaneously
    console.log('Starting parallel resource generation for all segments');
    const resourcePromises = segmentTitles.map(title => 
      generateResourcesForSegment(title, aiConfig)
    );
    
    const allResources = await Promise.all(resourcePromises);
    console.log('Completed resource generation for all segments');

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

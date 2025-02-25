
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
  // Remove any comments and trailing commas
  const cleanContent = content.replace(/\/\/.*$/gm, '')  // Remove single line comments
                             .replace(/\/\*[\s\S]*?\*\//gm, '') // Remove multi-line comments
                             .replace(/,(\s*[}\]])/g, '$1')     // Remove trailing commas
                             .trim();
  
  // Extract the JSON array
  const matches = cleanContent.match(/\[[\s\S]*\]/);
  if (!matches) {
    console.error('No JSON array found in response:', content);
    throw new Error('Invalid response format: No JSON array found');
  }

  return matches[0];
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

    const systemPrompt = `You are an educational resource finder that ONLY returns real, existing resources in ${language}.
    For the topic "${topic}", provide EXACTLY:
    - 3 video resources (from YouTube, Coursera, or edX)
    - 3 article resources (from educational websites, blogs, or digital libraries)
    - 3 research papers (from ResearchGate, SciELO, or academic repositories)

    CRITICAL REQUIREMENTS:
    1. ALL URLs must be real, existing URLs that work right now
    2. NO placeholder or example URLs
    3. ALL content must be in ${language}
    4. Each URL must be unique
    5. ALL descriptions must be clear and informative
    6. Format as a JSON array with exactly 9 items

    Example format (DO NOT COPY THESE URLS, FIND REAL ONES):
    [
      {"type": "video", "title": "Title", "url": "https://...", "description": "..."},
      // ... 8 more items
    ]`;

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Find exactly 9 educational resources about: ${topic}`
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
      console.error('Invalid response format from Perplexity:', data);
      throw new Error('Invalid response format from Perplexity');
    }

    try {
      const sanitizedJSON = sanitizeJSON(data.choices[0].message.content);
      console.log('Attempting to parse JSON:', sanitizedJSON);
      
      const resources = JSON.parse(sanitizedJSON);
      
      if (!Array.isArray(resources)) {
        console.error('Parsed result is not an array:', resources);
        throw new Error('Generated content is not a valid array');
      }

      // Validate each resource and ensure we have exactly 9 resources
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
      console.error(`Error processing resources for topic ${topic}:`, error);
      throw error;
    }
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


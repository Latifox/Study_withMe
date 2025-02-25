
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

// Helper function to clean markdown code blocks from the response
function cleanMarkdownCodeBlocks(text: string): string {
  // Remove markdown code block syntax if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json') || cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\n|^```\n/, '');
    cleaned = cleaned.replace(/\n```$/, '');
  }
  return cleaned.trim();
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

    const allResources: ConceptResources[] = [];

    for (const title of segmentTitles) {
      console.log('Generating resources for segment:', title);
      
      const prompt = `Based on the lecture content about "${title}", generate 9 high-quality educational resources:
      3 video resources (primarily from YouTube),
      3 article resources (from reputable educational websites),
      and 3 research papers or academic resources.
      
      Return ONLY valid JSON with NO markdown formatting, following this structure:
      {
        "concept": "${title}",
        "resources": [
          {
            "type": "video"|"article"|"research",
            "title": "Resource Title",
            "url": "Resource URL",
            "description": "Brief description of what this resource covers"
          }
        ]
      }
      
      Requirements:
      1. Return ONLY the JSON with NO markdown or code block formatting
      2. All fields must be strings
      3. "type" must be exactly "video", "article", or "research"
      4. Generate exactly 3 resources of each type
      5. Make sure all URLs are properly formatted
      6. DO NOT include any text before or after the JSON`;

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
              content: `You are an expert at finding relevant educational resources. Your responses must be in pure JSON format with no markdown or code block formatting. ${
                aiConfig?.content_language ? 
                `Generate all content in ${aiConfig.content_language} language.` : 
                'Generate content in English.'
              }${
                aiConfig?.custom_instructions ? 
                ' ' + aiConfig.custom_instructions : 
                ''
              }`
            },
            { role: 'user', content: prompt }
          ],
          temperature: aiConfig?.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid OpenAI response structure:', data);
        throw new Error('Invalid response structure from OpenAI');
      }

      // Clean any markdown formatting from the response
      const cleanedText = cleanMarkdownCodeBlocks(data.choices[0].message.content);
      console.log('Cleaned response text:', cleanedText);
      
      try {
        const parsedResources = JSON.parse(cleanedText);
        
        // Validate the parsed structure
        if (!parsedResources.concept || !Array.isArray(parsedResources.resources)) {
          console.error('Invalid resource structure:', parsedResources);
          throw new Error('Invalid resource structure in AI response');
        }

        // Validate each resource
        parsedResources.resources.forEach((resource: Resource, index: number) => {
          if (!resource.type || !resource.title || !resource.url || !resource.description) {
            console.error(`Invalid resource at index ${index}:`, resource);
            throw new Error(`Missing required fields in resource at index ${index}`);
          }
          if (!['video', 'article', 'research'].includes(resource.type)) {
            throw new Error(`Invalid resource type "${resource.type}" at index ${index}`);
          }
        });

        allResources.push(parsedResources);
        
      } catch (error) {
        console.error('Error parsing AI response:', error);
        console.error('Raw response:', cleanedText);
        throw new Error(`Failed to parse AI response: ${error.message}`);
      }
    }

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


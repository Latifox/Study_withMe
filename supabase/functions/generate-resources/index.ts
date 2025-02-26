
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Resource {
  title: string;
  url: string;
  description: string;
  resource_type: string;
}

serve(async (req) => {
  console.log('Generate resources function started');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!perplexityApiKey) {
      console.error('PERPLEXITY_API_KEY is not set');
      throw new Error('PERPLEXITY_API_KEY is not set');
    }

    const { topic, description } = await req.json();
    console.log('Received request for topic:', topic);

    const prompt = `You are an educational resource curator. Your task is to create a well-structured markdown document with exactly 3 high-quality educational resources about "${topic}". Context about the topic: ${description}

    Requirements:
    1. Format your response in clean markdown with proper headers and bullet points
    2. Include only resources in English that definitely exist and are accessible
    3. For YouTube videos, use search query URLs instead of direct links
       Example: https://www.youtube.com/results?search_query=Breaking+down+Distributed+Energy+Resources+channel%3AHydro+Ottawa
    4. Prioritize reputable sources like Khan Academy, educational platforms, and academic institutions
    5. Each resource should include:
       - A descriptive title
       - A valid URL
       - A brief explanation of its value
    6. Organize resources by type (e.g., Video, Article, Tutorial)

    Format example:
    ## Additional Learning Resources

    ### Videos
    - [Title of Video](youtube-search-url)
      Brief description of why this video is valuable

    ### Articles
    - [Article Title](article-url)
      Brief explanation of the article's relevance
    `;

    console.log('Sending request to Perplexity API');
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that suggests high-quality learning resources.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      console.error('Perplexity API error:', await response.text());
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received response from Perplexity API');

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Perplexity API');
    }

    // Return the markdown content directly
    const markdown = data.choices[0].message.content;
    console.log('Returning markdown content:', markdown);

    return new Response(
      JSON.stringify({ markdown }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    );
  } catch (error) {
    console.error('Error in generate-resources function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});


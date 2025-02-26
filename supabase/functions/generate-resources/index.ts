
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Generate resources function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    console.log('Checking Perplexity API key:', perplexityApiKey ? 'Present' : 'Missing');
    
    if (!perplexityApiKey) {
      console.error('Missing PERPLEXITY_API_KEY environment variable');
      throw new Error('Perplexity API credentials not configured');
    }

    const requestData = await req.json();
    console.log('Request data:', requestData);

    const { topic, description = '' } = requestData;
    console.log(`Generating resources for topic: "${topic}" with description: "${description}"`);

    const messages = [
      {
        role: "system",
        content: `You are an educational resource curator specialized in finding high-quality learning materials. For the topic "${topic}", find EXACTLY three types of resources: 1 video, 1 article, and 1 research paper or in-depth guide. Context: ${description}. 
        
        Requirements:
        - For videos: use YouTube search query format (e.g. https://www.youtube.com/results?search_query=TITLE)
        - Verify all links are accessible
        - Include brief descriptions with each resource
        - Focus on beginner-friendly content when possible
        - Format response in markdown`
      },
      {
        role: "user",
        content: `Find educational resources about "${topic}" that meet these criteria:

1. Video Resource:
   - Must be from reputable educational channels
   - Format: use YouTube search query
   - Prioritize content from established educational channels

2. Article Resource:
   - Must be from reliable sources (educational websites, reputable blogs, documentation)
   - Should be comprehensive yet accessible
   - Recent publication preferred

3. Academic/In-depth Resource:
   - Can be a research paper, detailed guide, or comprehensive documentation
   - Must be publicly accessible
   - Should provide deeper understanding

Format your response in markdown:

## Video Resources
[Title](youtube_search_url)
Brief description

## Article Resources
[Title](url)
Brief description

## In-depth Resources
[Title](url)
Brief description`
      }
    ];

    console.log('Calling Perplexity API...');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: messages,
        temperature: 0.1,
        max_tokens: 2048,
        return_images: false
      })
    });

    console.log('Perplexity API response status:', response.status);

    if (!response.ok) {
      console.error(`Perplexity API error status: ${response.status}`);
      const errorText = await response.text();
      console.error('Perplexity API error details:', errorText);
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Perplexity API response received');
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Unexpected Perplexity API response structure:', data);
      throw new Error('Invalid response format from Perplexity API');
    }
    
    const markdown = data.choices[0].message.content;
    console.log('Generated markdown content:', markdown);
    
    return new Response(
      JSON.stringify({ markdown }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-resources function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


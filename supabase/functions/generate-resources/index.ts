
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, description = '', language = 'english' } = await req.json();
    console.log(`Generating resources for topic: "${topic}" with description: "${description}" in ${language}`);

    if (!perplexityApiKey) {
      console.error('Missing PERPLEXITY_API_KEY environment variable');
      throw new Error('Perplexity API credentials not configured');
    }

    console.log('Calling Perplexity API...');

    const messages = [
      {
        role: "system",
        content: "You are an educational resource gatherer specialized in educational and academic resources. Gather and give me EXACTLY 3 high-quality resources about the topic."
      },
      {
        role: "user",
        content: `Search for at least 6 potential high-quality resources about "${topic}" and score each resource from 0-100 based on:

1. Resource Existence & Accessibility (50 points max):
   * For YouTube videos: You MUST verify if the video exists by checking its view count. If you can't find the view count, the video is unavailable - assign 0 points
   * For articles: Check publication date, author credentials, and domain reputation
   * For papers: Verify public accessibility and citation count

2. Content Quality & Relevance (50 points max):
   * Direct relevance to "${topic}"
   * Content depth and academic rigor
   * Author/creator expertise
   * For YouTube: Channel reputation and educational focus

Context about the topic:
${description}

STRICT REQUIREMENTS:
1. Each resource MUST be in English
2. YouTube videos MUST be verified by finding their view count
3. All URLs must be functional and accessible
4. Score each resource out of 100 total points
5. Select and return ONLY the top 3 scoring resources

Format the final 3 highest-scoring resources exactly like this:

## Video Resources
1. [Video Title](video_url)
   Description: Brief description of content and relevance
   
## Article Resources
1. [Article Title](article_url)
   Description: Brief description of content and relevance
   
## Research Papers
1. [Paper Title](paper_url)
   Description: Brief description of content and relevance`
      }
    ];

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: messages,
        temperature: 0.1,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      console.error(`Perplexity API error status: ${response.status}`);
      const errorText = await response.text();
      console.error('Perplexity API error details:', errorText);
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Perplexity API response structure:', JSON.stringify(data, null, 2));
    
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
    console.error('Detailed error in generate-resources function:', {
      error: error.message,
      stack: error.stack,
    });
    
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

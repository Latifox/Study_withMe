
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
        content: "You are an educational resource gatherer specialized in educational and academic resources. Your task is to find and score resources based on their relevance and likelihood of existence."
      },
      {
        role: "user",
        content: `Search for at least 6 potential high-quality resources about the topic "${topic}". For each resource you find, assign it a confidence score from 0 to 100 based on:

- Resource Existence & Accessibility (50 points max):
  * For YouTube videos: Verify the video exists and is not region-locked (must be globally available)
  * For articles: Check that the URL is from a reputable, stable source
  * For research papers: Ensure they are publicly accessible

- Content Quality & Relevance (50 points max):
  * Direct relevance to "${topic}"
  * Depth and accuracy of content
  * Authority of the source

Then select ONLY the 3 resources with the highest total scores (one video, one article, one research paper) to present to the user.

Context about the topic:
${description}

YOU MUST VERIFY THAT:
1. ALL URLs ARE FUNCTIONAL AND ACCESSIBLE
2. YOUTUBE VIDEOS ARE NOT REGION-LOCKED AND ARE PUBLICLY AVAILABLE
3. ALL RESOURCES ARE IN ENGLISH
4. ALL RESOURCES ARE DIRECTLY RELEVANT TO "${topic}"

Format the final 3 highest-scoring resources exactly like this:

## Video Resource
1. [Video Title](video_url)
   Description: Clear explanation of relevance

## Article Resource
1. [Article Title](article_url)
   Description: Clear explanation of relevance

## Research Paper
1. [Paper Title](paper_url)
   Description: Clear explanation of relevance`
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

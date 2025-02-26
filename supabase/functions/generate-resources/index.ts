
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
        content: `You are an educational resource gatherer specialized in educational and academic resources. Gather and give me EXACTLY 3 high-quality resources about the topic "${topic}". Context about the topic: ${description}. YOU HAVE TO MAKE SURE THE LINKS TO RESOURCES ARE VALID, AND THE RESOURCES ACTUALLY EXIST. YOU SHOULD BE SEARCHING FOR RESOURCES IN ENGLISH.`
      },
      {
        role: "user",
        content: `Search for at least 6 potential educational resources about "${topic}" and score each from 0-100 based on:

1. Resource Existence & Accessibility (50 points):
   * For YouTube videos: Score based on channel reputation, educational focus, expected availability
   * For articles: Score based on source reliability, author credentials, publication date
   * For research papers: Score based on public accessibility, citations, author credibility
   
2. Content Relevance & Quality (50 points):
   * Direct relevance to "${topic}"
   * Depth of content
   * Educational value
   * Comprehensibility for the target audience

IMPORTANT REQUIREMENTS:
1. ALL resources MUST be in English
2. For YouTube resources, provide SEARCH QUERY URLs:
   - Format: https://www.youtube.com/results?search_query=TITLE+WITH+PLUS+SIGNS
   - Example: For "Physics 101: Energy" → https://www.youtube.com/results?search_query=Physics+101+Energy
3. For articles and papers: Verify URLs are accessible
4. Return ONLY the 3 highest-scoring resources (one of each type)

Format your response EXACTLY like this:

## Video Resources
1. [Title of Educational Video](https://www.youtube.com/results?search_query=ENCODED+VIDEO+TITLE)
   Description: Brief explanation of content and relevance

## Article Resources
1. [Article Title](article_url)
   Description: Brief explanation of content and relevance

## Research Papers
1. [Paper Title](paper_url)
   Description: Brief explanation of content and relevance`
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


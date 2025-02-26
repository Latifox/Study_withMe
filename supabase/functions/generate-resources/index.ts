
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
        content: "You are an educational resource gatherer specialized in educational and academic resources."
      },
      {
        role: "user",
        content: `Gather and give me EXACTLY 6 high-quality resources about the topic "${topic}".

Context about the topic:
${description}

YOU HAVE TO MAKE SURE THE LINKS TO RESOURCES ARE VALID, AND THE RESOURCES ACTUALLY EXIST.
YOU SHOULD BE SEARCHING FOR RESOURCES IN ENGLISH.

Format Requirements:
   - Each resource MUST have a clear title
   - Each URL MUST be functional
   - Each description MUST explain relevance to "${topic}"
   - Follow this exact markdown format:

## Video Resources
1. [Video Title](video_url)
   Description: Clear explanation of relevance

2. [Video Title](video_url)
   Description: Clear explanation of relevance

## Article Resources
1. [Article Title](article_url)
   Description: Clear explanation of relevance

2. [Article Title](article_url)
   Description: Clear explanation of relevance

## Research Papers
1. [Paper Title](paper_url)
   Description: Clear explanation of relevance

2. [Paper Title](paper_url)
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

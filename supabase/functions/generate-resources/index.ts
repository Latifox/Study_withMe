
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const systemPrompt = `You are an educational resource curator who MUST generate EXACTLY 6 high-quality educational resources about "${topic}" in ${language}:

STRICT REQUIREMENTS:
- Generate EXACTLY 2 video resources from YouTube or educational platforms
- Generate EXACTLY 2 article resources from educational websites
- Generate EXACTLY 2 research papers from academic repositories
- All resources must be in ${language}
- All resources must have valid URLs
- Include a brief description for each resource

Format your response in markdown using this EXACT structure:

## Video Resources
1. [Title of Video 1](url1)
   Description: Brief description here
2. [Title of Video 2](url2)
   Description: Brief description here

## Article Resources
1. [Title of Article 1](url1)
   Description: Brief description here
2. [Title of Article 2](url2)
   Description: Brief description here

## Research Papers
1. [Title of Paper 1](url1)
   Description: Brief description here
2. [Title of Paper 2](url2)
   Description: Brief description here`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate exactly 6 educational resources about: ${topic}` }
        ],
        temperature: 0.1,
        max_tokens: 2000,
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

    const generatedContent = data.choices[0].message.content;
    console.log('Generated content:', generatedContent);

    return new Response(
      JSON.stringify({ content: generatedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-resources function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

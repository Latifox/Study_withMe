
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
    console.log(`Generating resources for topic: "${topic}" in ${language}`);

    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

    const systemPrompt = `As an educational resource curator, generate EXACTLY 6 educational resources about "${topic}" in ${language}.

STRICT FORMAT AND CONTENT REQUIREMENTS:

1. You MUST provide EXACTLY:
   - 2 video resources (from YouTube, Coursera, or edX)
   - 2 article resources (from .edu domains or reputable educational sites)
   - 2 research papers (from ResearchGate, ScienceDirect, or academic journals)

2. CRUCIAL: Each resource MUST have:
   - A real, functional URL that leads to actual content
   - An accurate, descriptive title
   - A brief but informative description
   - URLs must be unique and working links
   - No placeholder or example URLs

3. Content Guidelines:
   Videos:
   - Prefer educational channels and course content
   - Must be from: youtube.com, coursera.org, or edx.org
   - Each URL must be unique and actually exist
   
   Articles:
   - Must be from reputable educational websites
   - Prefer .edu domains or established educational platforms
   - Each URL must be unique and lead to actual content
   
   Research Papers:
   - Must be from: researchgate.net, sciencedirect.com, or academic journals
   - Papers should be accessible (prefer open access)
   - Each URL must be unique and lead to the actual paper

Format your response EXACTLY like this:

## Video Resources
1. [Title of First Video](complete_video_url_1)
   Description: Clear, specific description of the video content

2. [Title of Second Video](complete_video_url_2)
   Description: Clear, specific description of the video content

## Article Resources
1. [Title of First Article](complete_article_url_1)
   Description: Clear, specific description of the article content

2. [Title of Second Article](complete_article_url_2)
   Description: Clear, specific description of the article content

## Research Papers
1. [Title of First Paper](complete_paper_url_1)
   Description: Clear, specific description of the paper content

2. [Title of Second Paper](complete_paper_url_2)
   Description: Clear, specific description of the paper content`;

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
          { role: 'user', content: `Generate educational resources about "${topic}" in ${language}. Remember to provide REAL, WORKING URLs for each resource.` }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status} ${response.statusText}`);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const markdown = data.choices[0].message.content;
    
    return new Response(
      JSON.stringify({ markdown }), 
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


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

    const systemPrompt = `You are an educational content curator focusing on academic content. Generate EXACTLY 6 high-quality educational resources about "${topic}" in ${language}.

YOUR RESPONSE MUST STRICTLY FOLLOW THESE RULES:
1. Generate EXACTLY 6 resources in total:
   - EXACTLY 2 video resources (from educational platforms)
   - EXACTLY 2 article resources (from reputable websites)
   - EXACTLY 2 research papers (from academic sources)

2. URL REQUIREMENTS:
   - Each URL MUST BE REAL AND UNIQUE
   - NO placeholder or example URLs
   - USE ONLY educational sources like:
     - Videos: coursera.org, edx.org, youtube.com/edu
     - Articles: educational institutions, government .edu sites
     - Papers: researchgate.net, sciencedirect.com, springer.com

3. FORMATTING:
   Generate your response in this EXACT markdown format:

## Video Resources
1. [Title of First Video](video_url_1)
   Description: Brief description
2. [Title of Second Video](video_url_2)
   Description: Brief description

## Article Resources
1. [Title of First Article](article_url_1)
   Description: Brief description
2. [Title of Second Article](article_url_2)
   Description: Brief description

## Research Papers
1. [Title of First Paper](paper_url_1)
   Description: Brief description
2. [Title of Second Paper](paper_url_2)
   Description: Brief description`;

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
          { role: 'user', content: `Generate exactly 6 educational resources (2 videos, 2 articles, 2 research papers) about: "${topic}" in ${language}. Follow the format exactly.` }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        frequency_penalty: 1,
        presence_penalty: 0.8
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status} ${response.statusText}`);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const markdown = data.choices[0].message.content;
    
    // Parse resources from markdown
    const lines = markdown.split('\n');
    const resources = [];
    let currentType = '';

    for (const line of lines) {
      if (line.startsWith('## ')) {
        currentType = line.includes('Video') ? 'video' : 
                     line.includes('Article') ? 'article' : 
                     'research_paper';
      } else if (line.match(/^\d\.\s+\[.*\]\(.*\)/)) {
        const [, title, url] = line.match(/^\d\.\s+\[(.*)\]\((.*)\)/) || [];
        const descLine = lines[lines.indexOf(line) + 1];
        const description = descLine ? descLine.replace(/^\s*Description:\s*/, '') : '';
        
        if (title && url) {
          resources.push({
            title,
            url,
            description,
            type: currentType
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        resources,
        markdown 
      }),
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

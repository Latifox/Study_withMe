
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

    const systemPrompt = `Generate EXACTLY 6 educational resources about "${topic}" in ${language}, following this EXACT order:

STRICT REQUIREMENTS:
1. Generate resources in this EXACT order:
   - FIRST: 2 video resources
   - THEN: 2 article resources
   - FINALLY: 2 research papers

2. Each resource MUST have:
   - A real, unique URL
   - A clear title
   - A brief description

3. Use ONLY these types of sources:
   - Videos: youtube.com, edx.org, coursera.org
   - Articles: .edu domains, authoritative educational websites
   - Research papers: researchgate.net, sciencedirect.com, springer.com

Format your response in this EXACT markdown structure:

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
          { role: 'user', content: `Generate 6 educational resources (2 videos, 2 articles, 2 research papers) about: "${topic}" in ${language}` }
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
    
    // Parse resources from markdown maintaining order
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

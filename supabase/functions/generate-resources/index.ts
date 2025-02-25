
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

    const systemPrompt = `You are an educational resource curator. Generate EXACTLY 6 high-quality and UNIQUE educational resources about "${topic}" in ${language}.

REQUIREMENTS:
- You MUST provide EXACTLY 2 DIFFERENT video resources (each from unique URLs)
- You MUST provide EXACTLY 2 DIFFERENT article resources (each from unique URLs)
- You MUST provide EXACTLY 2 DIFFERENT research papers (each from unique URLs)
- All resources MUST be in ${language}
- Each resource MUST have a DIFFERENT URL - no duplicate URLs allowed
- NEVER use placeholder URLs like example.com
- Include a brief but informative description for each resource

Format your response in markdown EXACTLY like this:

## Video Resources
1. [Title of First Video](url1)
   Description: Brief description here
2. [Title of Second Video](url2)
   Description: Brief description here

## Article Resources
1. [Title of First Article](url1)
   Description: Brief description here
2. [Title of Second Article](url2)
   Description: Brief description here

## Research Papers
1. [Title of First Paper](url1)
   Description: Brief description here
2. [Title of Second Paper](url2)
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
          { role: 'user', content: `Based on the given format, provide exactly 6 UNIQUE educational resources about: ${topic}` }
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
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid response format from Perplexity:', data);
      throw new Error('Invalid response format from Perplexity');
    }

    const markdown = data.choices[0].message.content;
    console.log('Generated markdown:', markdown);

    // Parse the markdown to extract resources
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


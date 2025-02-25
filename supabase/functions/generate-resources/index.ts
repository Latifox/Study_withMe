
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an educational resource curator specializing in academic content. Search the web to generate EXACTLY 6 high-quality educational resources about the topic "${topic}" in ${language}.

Context about the topic:
${description}

STRICT REQUIREMENTS:

1. Resource Distribution (EXACTLY):
   - 2 video lectures/tutorials from reputable educational sources
   - 2 academic articles/press material
   - 2 research papers or academic publications

2. Resource Quality Requirements:
   Videos (MUST follow ALL these rules):
   - NO entertainment videos, music, or non-educational content
   - MUST be directly related to "${topic}" and its description
   - MUST be from: youtube.com 
   - Each URL must be unique and functional
   
   Articles (MUST follow ALL these rules)
   - MUST be directly related to "${topic}" and its description
   - MUST be accessible without subscription
   - NO opinion pieces or blog posts
   - Each URL must be unique and functional
   
   Research Papers (MUST follow ALL these rules):
   - ONLY links to Google Scholar
   - MUST be directly related to "${topic}" and its description
   - Prefer open-access papers
   - Each URL must be unique and functional

3. Format Requirements:
   - Use markdown list format
   - Each resource MUST have a clear, descriptive title
   - URLs MUST be real and functional
   - Descriptions MUST explain the specific relevance to "${topic}"

Response Format:

## Video Resources
1. [Complete Video Title](video_url)
   Description: Clear explanation of how this video specifically addresses ${topic}

2. [Complete Video Title](video_url)
   Description: Clear explanation of how this video specifically addresses ${topic}

## Article Resources
1. [Complete Article Title](article_url)
   Description: Clear explanation of how this article specifically addresses ${topic}

2. [Complete Article Title](article_url)
   Description: Clear explanation of how this article specifically addresses ${topic}

## Research Papers
1. [Complete Paper Title](paper_url)
   Description: Clear explanation of how this paper specifically addresses ${topic}

2. [Complete Paper Title](paper_url)
   Description: Clear explanation of how this paper specifically addresses ${topic}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate strictly educational resources about "${topic}" with context: "${description}" in ${language}. Remember: ONLY educational content, NO entertainment or non-academic sources, and verify all URLs are functional.` }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
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


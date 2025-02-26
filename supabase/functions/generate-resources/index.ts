
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

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

    if (!googleApiKey) {
      console.error('Missing GOOGLE_API_KEY environment variable');
      throw new Error('Google API credentials not configured');
    }

    console.log('Calling Gemini API with key length:', googleApiKey.length);

    // Call Gemini API
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${googleApiKey}`
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an educational resource curator specializing in academic content. Generate EXACTLY 6 high-quality educational resources about the topic "${topic}" in ${language}. 

Context about the topic:
${description}

STRICT REQUIREMENTS:

1. Resource Distribution (EXACTLY):
   - 2 video lectures/tutorials from reputable educational sources
   - 2 academic articles from educational institutions or reputable organizations
   - 2 research papers from Google Scholar

2. Resource Quality Requirements:
   Videos:
   - Only from: youtube.com, coursera.org, edx.org, or mit.edu
   - MUST be directly educational and relevant to "${topic}"
   - NO entertainment content
   
   Articles:
   - Only from: .edu, .org, or established educational websites
   - MUST be academic or professional in nature
   - NO opinion pieces or blog posts
   
   Research Papers:
   - Only from: scholar.google.com
   - Prefer open-access papers
   - Must be directly relevant to "${topic}"

3. Format Requirements:
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
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
      })
    });

    if (!geminiResponse.ok) {
      console.error(`Gemini API error status: ${geminiResponse.status}`);
      const errorText = await geminiResponse.text();
      console.error('Gemini API error details:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini API response structure:', JSON.stringify(geminiData, null, 2));
    
    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected Gemini API response structure:', geminiData);
      throw new Error('Invalid response format from Gemini API');
    }
    
    const markdown = geminiData.candidates[0].content.parts[0].text;
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

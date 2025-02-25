
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
    const { lectureContent, aiConfig, segmentTitles } = await req.json();
    
    console.log('Processing request with:', {
      contentLength: lectureContent?.length || 0,
      aiConfig,
      segmentTitles
    });

    if (!lectureContent || !segmentTitles || !segmentTitles.length) {
      throw new Error('Missing required data: lectureContent or segmentTitles');
    }

    const allResources = [];

    for (const title of segmentTitles) {
      console.log('Generating resources for segment:', title);
      
      const prompt = `Based on the lecture content about "${title}", generate 9 high-quality educational resources:
      3 video resources (primarily from YouTube),
      3 article resources (from reputable educational websites),
      and 3 research papers or academic resources.
      
      Format your response as a JSON object with this structure:
      {
        "concept": "${title}",
        "resources": [
          {
            "type": "video"|"article"|"research",
            "title": "Resource Title",
            "url": "Resource URL",
            "description": "Brief description of what this resource covers"
          }
        ]
      }`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert at finding relevant educational resources. ${
                aiConfig?.content_language ? 
                `Generate all content in ${aiConfig.content_language} language.` : 
                'Generate content in English.'
              }${
                aiConfig?.custom_instructions ? 
                ' ' + aiConfig.custom_instructions : 
                ''
              }`
            },
            { role: 'user', content: prompt }
          ],
          temperature: aiConfig?.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error:', await response.text());
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.choices[0].message.content;

      try {
        const segmentResources = JSON.parse(generatedText);
        allResources.push(segmentResources);
      } catch (error) {
        console.error('Error parsing AI response:', error);
        throw new Error('Invalid JSON response from AI service');
      }
    }

    return new Response(JSON.stringify(allResources), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in generate-resources function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

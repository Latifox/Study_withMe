
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureContent, aiConfig, segmentTitles } = await req.json();
    
    console.log('Generating resources for lecture content:', lectureContent?.substring(0, 100));
    console.log('Using AI config:', aiConfig);
    console.log('Segment titles:', segmentTitles);

    // Create system instruction with language configuration
    let systemInstruction = 'You are an expert at finding relevant educational resources.';
    if (aiConfig?.content_language) {
      systemInstruction += ` Generate all content in ${aiConfig.content_language} language.`;
    }
    if (aiConfig?.custom_instructions) {
      systemInstruction += ' ' + aiConfig.custom_instructions;
    }

    const resources = [];

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
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ],
          temperature: aiConfig?.temperature || 0.7,
        }),
      });

      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid response from OpenAI:', data);
        throw new Error('Invalid response from AI service');
      }

      // Parse the response and add to resources array
      try {
        const segmentResources = JSON.parse(data.choices[0].message.content);
        resources.push(segmentResources);
      } catch (error) {
        console.error('Error parsing AI response for segment:', title, error);
        throw new Error('Invalid JSON response from AI service');
      }
    }

    return new Response(JSON.stringify(resources), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-resources function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

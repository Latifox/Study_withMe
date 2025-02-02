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
    const { lectureContent } = await req.json();
    
    if (!lectureContent) {
      throw new Error('Lecture content is required');
    }

    console.log('Generating resources for lecture content:', lectureContent.substring(0, 100) + '...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an AI that identifies key concepts from lecture content and finds relevant educational resources. For each key concept, provide at least 3 resources in each category:
            1. Video resources (primarily from YouTube)
            2. Article resources (from reputable news and educational websites)
            3. Research resources (academic papers, studies, or scholarly articles)
            
            Format the response as a JSON array of objects, where each object contains:
            {
              "concept": "Key Concept Name",
              "resources": [
                {
                  "type": "video"|"article"|"research",
                  "title": "Resource Title",
                  "url": "Resource URL",
                  "description": "Brief description of the resource"
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Generate educational resources for the following lecture content: ${lectureContent}`
          }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    console.log('OpenAI response received');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI');
    }

    // Parse the content as JSON, removing any markdown formatting if present
    const content = data.choices[0].message.content;
    const cleanContent = content.replace(/```json\n|\n```/g, '');
    const resources = JSON.parse(cleanContent);

    console.log('Successfully parsed resources:', resources.length, 'concepts found');

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
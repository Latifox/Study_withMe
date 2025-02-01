import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId } = await req.json();
    console.log('Generating mindmap for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture?.content) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    console.log('Successfully fetched lecture content');

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

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
            content: `You are a mindmap generator. Generate a mindmap structure in JSON format.
            Return ONLY a valid JSON object with this exact structure, nothing else:
            {
              "nodes": [
                {
                  "id": "string",
                  "label": "string",
                  "type": "main" | "subtopic" | "detail",
                  "parentId": null or "string"
                }
              ]
            }
            Rules:
            1. Create exactly one main node (type: "main")
            2. Create 3-5 subtopic nodes (type: "subtopic")
            3. For each subtopic, create 2-3 detail nodes (type: "detail")
            4. Main node should have parentId: null
            5. Subtopics should have the main node's id as parentId
            6. Details should have their subtopic's id as parentId
            7. Each id must be unique
            8. Do not include any markdown formatting or code block markers`
          },
          {
            role: 'user',
            content: `Generate a mindmap for this lecture titled "${lecture.title}":\n\n${lecture.content}`
          }
        ],
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      const errorData = await response.json();
      console.error('OpenAI error details:', errorData);
      throw new Error('Failed to generate mindmap');
    }

    const data = await response.json();
    console.log('Raw OpenAI response:', data.choices[0].message.content);

    try {
      // Attempt to parse the response content as JSON
      const mindmapContent = JSON.parse(data.choices[0].message.content);
      
      // Validate the structure
      if (!mindmapContent.nodes || !Array.isArray(mindmapContent.nodes)) {
        throw new Error('Invalid mindmap structure');
      }

      return new Response(
        JSON.stringify(mindmapContent),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw content:', data.choices[0].message.content);
      throw new Error('Failed to parse mindmap data');
    }
  } catch (error) {
    console.error('Error generating mindmap:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
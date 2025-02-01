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
            content: `You are a mindmap generator. Create a hierarchical mindmap structure for the lecture content. 
            The response should be a JSON object with nodes array containing mindmap nodes.
            Each node should have:
            - id: unique string
            - label: text content
            - type: "main" | "subtopic" | "detail"
            - parentId: id of parent node (null for root)
            
            Create:
            - One main topic (type: "main")
            - 3-5 key subtopics (type: "subtopic")
            - 2-3 details for each subtopic (type: "detail")`
          },
          {
            role: 'user',
            content: `Generate a mindmap for this lecture titled "${lecture.title}":\n\n${lecture.content}`
          }
        ],
        temperature: 0.7,
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
    console.log('Successfully generated mindmap from OpenAI');

    // Parse the response to ensure it's valid JSON
    const mindmapContent = JSON.parse(data.choices[0].message.content);
    
    return new Response(
      JSON.stringify(mindmapContent),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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
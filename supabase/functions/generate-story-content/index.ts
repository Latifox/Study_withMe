import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId } = await req.json();
    console.log('Generating story content for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .single();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw lectureError;
    }

    if (!lecture?.content) {
      throw new Error('No lecture content found');
    }

    // Generate story content using OpenAI
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
            content: `You are an expert at breaking down educational content into engaging, story-like segments. 
            Create a learning journey that teaches the material in an engaging way. 
            Each segment should have 2 slides explaining concepts and 2 multiple choice questions to test understanding.
            Format your response as a JSON object with segments array. Each segment should have:
            - id (string)
            - title (string) 
            - slides array with 2 objects containing id and content (markdown)
            - questions array with 2 objects containing id, type ("multiple_choice"), question, options array, correctAnswer, and explanation`
          },
          {
            role: 'user',
            content: `Create a story-based learning journey for this lecture titled "${lecture.title}". Here's the content to teach: ${lecture.content}`
          }
        ],
        temperature: 0.7,
      }),
    });

    const aiResponse = await response.json();
    console.log('AI Response received');

    if (!aiResponse.choices?.[0]?.message?.content) {
      throw new Error('Invalid AI response');
    }

    let storyContent;
    try {
      storyContent = JSON.parse(aiResponse.choices[0].message.content);
      console.log('Successfully parsed AI response into story content');
    } catch (e) {
      console.error('Error parsing AI response:', e);
      throw new Error('Failed to parse AI response');
    }

    return new Response(
      JSON.stringify({ storyContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-story-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
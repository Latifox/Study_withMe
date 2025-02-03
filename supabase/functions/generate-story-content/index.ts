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
    console.log('Starting story titles generation for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .maybeSingle();

    if (lectureError || !lecture) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    console.log('Generating segment titles with OpenAI...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a curriculum designer. Analyze the lecture content and identify 10 key segments or topics that form a logical learning progression. Return ONLY a JSON array of 10 segment titles, no other text.

            Example format:
            ["Introduction to Topic", "Basic Concepts", "Advanced Theory", ...]

            Rules:
            - Exactly 10 titles
            - Each title should be clear and concise (3-6 words)
            - Titles should follow a logical progression
            - Return only the JSON array, no other text`
          },
          {
            role: 'user',
            content: lecture.content
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const aiResponseData = await openAIResponse.json();
    console.log('Raw OpenAI response:', aiResponseData.choices[0].message.content);
    
    const segmentTitles = JSON.parse(aiResponseData.choices[0].message.content);

    if (!Array.isArray(segmentTitles) || segmentTitles.length !== 10) {
      throw new Error('Invalid segment titles generated');
    }

    console.log('Creating story content entry...');
    const { data: storyContent, error: storyError } = await supabaseClient
      .from('story_contents')
      .insert({
        lecture_id: lectureId,
        segment_1_title: segmentTitles[0],
        segment_2_title: segmentTitles[1],
        segment_3_title: segmentTitles[2],
        segment_4_title: segmentTitles[3],
        segment_5_title: segmentTitles[4],
        segment_6_title: segmentTitles[5],
        segment_7_title: segmentTitles[6],
        segment_8_title: segmentTitles[7],
        segment_9_title: segmentTitles[8],
        segment_10_title: segmentTitles[9]
      })
      .select()
      .single();

    if (storyError) {
      console.error('Error creating story content:', storyError);
      throw storyError;
    }

    console.log('Successfully generated and stored segment titles');
    return new Response(
      JSON.stringify({ success: true, storyContent }),
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
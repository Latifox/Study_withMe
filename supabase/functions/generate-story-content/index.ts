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
    console.log('Generating story structure for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content and AI config
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture?.content) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    // Fetch AI configuration
    const { data: aiConfig, error: aiConfigError } = await supabaseClient
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .single();

    if (aiConfigError) {
      console.log('No AI config found, using defaults');
    }

    // Use default values if no config is found
    const config = aiConfig || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      custom_instructions: ''
    };

    console.log('Using AI config:', config);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert educational content organizer. Generate exactly 10 clear, descriptive segment titles for this lecture content in the same language as the lecture content.
            
            AI Configuration Settings:
            - Temperature: ${config.temperature} (higher means more creative/varied titles)
            - Creativity Level: ${config.creativity_level} (higher means more engaging and unique titles)
            - Detail Level: ${config.detail_level} (higher means more specific and comprehensive titles)
            ${config.custom_instructions ? `\nCustom Instructions:\n${config.custom_instructions}` : ''}
            
            Rules for titles:
            1. Each title should be concise but descriptive (3-7 words)
            2. Titles should follow a logical progression
            3. Use professional, academic language
            4. Avoid technical jargon unless necessary
            5. Ensure titles are engaging and clear
            6. Use the same language as the lecture content
            7. Adjust creativity and specificity based on the AI configuration
            
            Return a JSON object with exactly 10 numbered titles. DO NOT include any markdown formatting or code block indicators.
            Example format:
            {
              "segment_1_title": "Introduction to [Topic]",
              "segment_2_title": "Basic Concepts and Definitions",
              ...
              "segment_10_title": "Advanced Applications"
            }`
          },
          {
            role: 'user',
            content: lecture.content
          }
        ],
        temperature: config.temperature,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw OpenAI response:', data);

    let titles;
    try {
      const content = data.choices[0].message.content;
      // Remove any potential markdown formatting
      const cleanContent = content.replace(/```json\n|\n```/g, '');
      titles = JSON.parse(cleanContent);
      
      if (!titles || Object.keys(titles).length !== 10) {
        throw new Error('Invalid titles object - must have exactly 10 segments');
      }
      
      console.log('Successfully parsed titles:', titles);
    } catch (error) {
      console.error('Error parsing titles:', error);
      throw new Error(`Failed to parse titles: ${error.message}`);
    }

    // Store the story structure
    const { data: storyStructure, error: storyError } = await supabaseClient
      .from('story_structures')
      .insert([{
        lecture_id: lectureId,
        ...titles
      }])
      .select()
      .single();

    if (storyError) {
      console.error('Error creating story structure:', storyError);
      throw new Error('Failed to create story structure');
    }

    console.log('Successfully created story structure with titles');

    return new Response(
      JSON.stringify({ storyStructure }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-story-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
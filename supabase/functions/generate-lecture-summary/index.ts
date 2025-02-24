
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    console.log('Processing request for lecture:', lectureId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      throw new Error('OpenAI API key is not configured');
    }

    // Fetch the AI configuration for this lecture
    const { data: aiConfig, error: aiConfigError } = await supabase
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (aiConfigError) {
      console.error('Error fetching AI config:', aiConfigError);
      throw new Error('Failed to fetch AI configuration');
    }

    // First check if we already have highlights for this lecture
    const { data: existingHighlights, error: highlightsError } = await supabase
      .from('lecture_highlights')
      .select('*')
      .eq('lecture_id', lectureId)
      .single();

    if (highlightsError && highlightsError.code !== 'PGRST116') {
      console.error('Error fetching highlights:', highlightsError);
      throw new Error('Failed to fetch existing highlights');
    }

    if (existingHighlights?.content) {
      console.log('Found existing highlights');
      return new Response(JSON.stringify({
        content: existingHighlights.content
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no existing highlights, fetch lecture content
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    if (!lecture.content) {
      throw new Error('Lecture content is empty');
    }

    console.log('Successfully fetched lecture content');

    const systemPrompt = `You are an expert educational content analyst focused on creating comprehensive, detailed summaries of lecture content. Your task is to analyze the lecture content and create a thorough, well-structured summary that will help students understand and retain the material better.

Please provide a detailed analysis that includes:
- Key concepts and their explanations
- Main ideas and their significance
- Important relationships between concepts
- Supporting evidence and examples
- Notable quotes and their context
- Any other relevant aspects you identify as important

Use markdown formatting to structure your response in a clear, readable way. Feel free to organize the content in the most logical way for the specific material - don't feel constrained to follow a specific format.

${aiConfig?.custom_instructions ? `\nAdditional analysis requirements: ${aiConfig.custom_instructions}` : ''}
${aiConfig?.content_language ? `\nProvide analysis in: ${aiConfig.content_language}` : ''}`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: lecture.content }
        ],
        temperature: aiConfig?.temperature ?? 0.7,
        presence_penalty: aiConfig?.creativity_level ?? 0.5,
        frequency_penalty: aiConfig?.detail_level ?? 0.6,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error('Failed to generate content: OpenAI API error');
    }

    const data = await openAIResponse.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response format:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    const content = data.choices[0].message.content.trim();
    console.log('Generated content length:', content.length);

    // Store the content in the database
    const { error: insertError } = await supabase
      .from('lecture_highlights')
      .insert([{
        lecture_id: lectureId,
        content: content
      }]);

    if (insertError) {
      console.error('Error storing highlights:', insertError);
      throw new Error('Failed to store highlights in database');
    }

    return new Response(JSON.stringify({
      content: content
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-lecture-summary:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check the function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

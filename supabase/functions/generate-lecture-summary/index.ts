
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

    if (existingHighlights) {
      console.log('Found existing highlights');
      return new Response(JSON.stringify({
        content: existingHighlights
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no existing highlights, fetch lecture content and generate new ones
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .maybeSingle();

    if (lectureError || !lecture) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    console.log('Successfully fetched lecture content');

    const systemPrompt = `You are an expert educational content analyzer. Your task is to analyze lecture content and provide a comprehensive analysis organized into six distinct sections, each properly formatted in markdown:

    1. Structure: Provide a clear outline of the content organization
    2. Key Concepts: List and explain the main theoretical concepts
    3. Main Ideas: Summarize the central arguments or themes
    4. Important Quotes: Extract and explain significant quotations
    5. Relationships: Analyze connections between concepts
    6. Supporting Evidence: Detail the evidence used to support main arguments

    ${aiConfig?.custom_instructions ? `\n\nAdditional instructions: ${aiConfig.custom_instructions}` : ''}
    ${aiConfig?.content_language ? `\n\nPlease provide the content in: ${aiConfig.content_language}` : ''}`;

    const userPrompt = `Analyze this lecture content and provide a detailed analysis following the specified sections:\n\n${lecture.content}`;

    console.log('Sending request to OpenAI');

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: aiConfig?.temperature ?? 0.7,
        presence_penalty: aiConfig?.creativity_level ?? 0.5,
        frequency_penalty: aiConfig?.detail_level ?? 0.6,
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate content from OpenAI');
    }

    const data = await openAIResponse.json();
    console.log('Received response from OpenAI');

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response format:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    const content = data.choices[0].message.content.trim();

    // Extract sections using regex
    const sections = {
      structure: content.match(/Structure:([^#]*)/s)?.[1]?.trim() || '',
      key_concepts: content.match(/Key Concepts:([^#]*)/s)?.[1]?.trim() || '',
      main_ideas: content.match(/Main Ideas:([^#]*)/s)?.[1]?.trim() || '',
      important_quotes: content.match(/Important Quotes:([^#]*)/s)?.[1]?.trim() || '',
      relationships: content.match(/Relationships:([^#]*)/s)?.[1]?.trim() || '',
      supporting_evidence: content.match(/Supporting Evidence:([^#]*)/s)?.[1]?.trim() || ''
    };

    // Store the highlights
    const { error: insertError } = await supabase
      .from('lecture_highlights')
      .insert([{
        lecture_id: lectureId,
        ...sections
      }]);

    if (insertError) {
      console.error('Error inserting highlights:', insertError);
      throw new Error('Failed to store highlights in database');
    }

    console.log('Successfully processed and stored content');

    return new Response(JSON.stringify({
      content: sections
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


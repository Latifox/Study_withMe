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
    const { lectureId, message } = await req.json();
    console.log('Processing chat for lecture:', lectureId, 'with message:', message);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content and AI config in parallel
    const [lectureResponse, configResponse] = await Promise.all([
      supabaseClient
        .from('lectures')
        .select('content, title')
        .eq('id', lectureId)
        .single(),
      supabaseClient
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .maybeSingle()
    ]);

    if (lectureResponse.error) {
      console.error('Error fetching lecture:', lectureResponse.error);
      throw new Error('Failed to fetch lecture content');
    }

    const lecture = lectureResponse.data;
    const config = configResponse.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      custom_instructions: ''
    };

    console.log('Using AI config:', config);

    if (!lecture.content) {
      throw new Error('No lecture content available');
    }

    // Build system message with custom instructions and configuration
    let systemMessage = `You are a helpful AI assistant that helps students understand their lecture content. 
    You have access to the following lecture content titled "${lecture.title}":
    
    ${lecture.content}
    
    Base your responses on this lecture content. If asked something not covered in the lecture,
    politely inform that it's not covered in this specific lecture material.
    
    Adjust your responses based on these parameters:
    - Creativity Level: ${config.creativity_level} (higher means more creative and exploratory responses)
    - Detail Level: ${config.detail_level} (higher means more detailed and comprehensive responses)`;

    if (config.custom_instructions) {
      systemMessage += `\n\nAdditional instructions for handling this lecture:\n${config.custom_instructions}`;
    }

    console.log('Sending request to OpenAI with temperature:', config.temperature);

    // Call OpenAI API with configured parameters
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message }
        ],
        temperature: config.temperature,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      const errorText = await response.text();
      console.error('OpenAI API error details:', errorText);
      throw new Error('Failed to generate response');
    }

    const data = await response.json();
    console.log('Successfully generated response');

    return new Response(JSON.stringify({
      response: data.choices[0].message.content
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-with-lecture function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
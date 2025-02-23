
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
    const { lectureId, sections } = await req.json();
    console.log('Processing request for lecture:', lectureId, 'sections:', sections);

    // Fetch lecture content
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Construct a clear prompt that explicitly requests JSON
    const systemPrompt = `You are an expert educational content analyzer. Your task is to analyze lecture content and provide structured information. You MUST respond with a valid JSON object containing EXACTLY these keys: ${sections.join(', ')}. Each section must be properly formatted and contain relevant information from the lecture. DO NOT include any explanatory text outside the JSON structure.`;

    const userPrompt = `Analyze the following lecture content and provide a response ONLY in JSON format with the requested sections: ${sections.join(', ')}.\n\nLecture content: ${lecture.content}`;

    console.log('Sending request to OpenAI with sections:', sections);

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
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
      console.error('Invalid OpenAI response format:', JSON.stringify(data));
      throw new Error('Invalid response format from OpenAI');
    }

    const rawContent = data.choices[0].message.content.trim();
    console.log('Raw content from OpenAI:', rawContent);

    // Clean the content and attempt to parse JSON
    const cleanContent = rawContent.replace(/```json\n?|\n?```/g, '');
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(cleanContent);
      console.log('Successfully parsed JSON content');
    } catch (error) {
      console.error('JSON parsing error:', error);
      console.error('Failed to parse content:', cleanContent);
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    // Validate all required sections are present
    const missingKeys = sections.filter(key => !(key in parsedContent));
    if (missingKeys.length > 0) {
      console.error('Missing required sections in response:', missingKeys);
      throw new Error(`Missing required sections: ${missingKeys.join(', ')}`);
    }

    console.log('Validation complete, sending response');
    return new Response(JSON.stringify({ content: parsedContent }), {
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

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
    const { lectureId, fetchAll } = await req.json();
    console.log('Processing request for lecture:', lectureId, 'fetchAll:', fetchAll);

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

    if (fetchAll) {
      const systemPrompt = `You are an expert educational content analyzer. Analyze the lecture content and provide a comprehensive analysis organized into these sections: Structure, Key Concepts, Main Ideas, Important Quotes, Relationships, and Supporting Evidence. Format your entire response in markdown, using appropriate headers (##) for each section.`;

      const userPrompt = `Analyze this lecture content and provide a well-structured markdown analysis:\n\n${lecture.content}`;

      console.log('Sending request to OpenAI for markdown analysis');

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

      const content = {
        structure: data.choices[0].message.content,
        keyConcepts: data.choices[0].message.content,
        mainIdeas: data.choices[0].message.content,
        importantQuotes: data.choices[0].message.content,
        relationships: data.choices[0].message.content,
        supportingEvidence: data.choices[0].message.content
      };

      return new Response(JSON.stringify(content), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      const systemPrompt = `You are an expert educational content analyzer. Analyze the lecture content and provide a comprehensive analysis in markdown format.`;

      const userPrompt = `Analyze this lecture content and provide insights:\n\n${lecture.content}`;

      console.log('Sending request to OpenAI for markdown content');

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

      const content = data.choices[0].message.content.trim();
      console.log('Successfully processed content');

      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
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

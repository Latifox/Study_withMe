
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { lectureId, part } = await req.json();
    console.log('Processing request for lecture:', lectureId, 'part:', part);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the lecture content and AI configuration
    const [lectureResult, aiConfigResult] = await Promise.all([
      supabase
        .from('lectures')
        .select('content, title')
        .eq('id', lectureId)
        .single(),
      supabase
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .maybeSingle()
    ]);

    if (lectureResult.error) {
      console.error('Error fetching lecture:', lectureResult.error);
      throw new Error('Failed to fetch lecture content');
    }

    const lectureData = lectureResult.data;
    const aiConfig = aiConfigResult.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      content_language: null,
      custom_instructions: null
    };

    // Initialize OpenAI API configuration
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: part === 'full' ? [
          { role: 'system', content: 'You are an expert educational content analyzer.' },
          { 
            role: 'user', 
            content: `Provide a comprehensive, detailed summary of the following lecture content:
              ${aiConfig.custom_instructions ? `\nSpecific instructions: ${aiConfig.custom_instructions}` : ''}
              ${aiConfig.content_language ? `\nPlease provide the content in: ${aiConfig.content_language}` : ''}
              
              Title: ${lectureData.title}
              Content: ${lectureData.content}`
          }
        ] : [
          {
            role: 'system',
            content: `You are an expert educational content analyzer. Analyze the lecture content and provide detailed analysis in 6 sections: Structure, Key Concepts, Main Ideas, Important Quotes, Relationships, and Supporting Evidence. Format each section properly in markdown.
              ${aiConfig.custom_instructions ? `\nSpecific instructions: ${aiConfig.custom_instructions}` : ''}
              ${aiConfig.content_language ? `\nProvide the content in: ${aiConfig.content_language}` : ''}`
          },
          {
            role: 'user',
            content: lectureData.content
          }
        ],
        temperature: aiConfig.temperature,
        presence_penalty: aiConfig.creativity_level,
        frequency_penalty: aiConfig.detail_level,
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

    if (part === 'full') {
      // Handle full summary
      const { error: upsertError } = await supabase
        .from('lecture_highlights')
        .upsert({
          lecture_id: lectureId,
          full_content: content,
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        console.error('Error upserting full summary:', upsertError);
        throw new Error('Failed to store full summary');
      }

      return new Response(JSON.stringify({
        content: { full_content: content }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Handle regular highlights
      // Extract sections using regex
      const sections = {
        structure: content.match(/Structure:([^#]*)/s)?.[1]?.trim() || '',
        key_concepts: content.match(/Key Concepts:([^#]*)/s)?.[1]?.trim() || '',
        main_ideas: content.match(/Main Ideas:([^#]*)/s)?.[1]?.trim() || '',
        important_quotes: content.match(/Important Quotes:([^#]*)/s)?.[1]?.trim() || '',
        relationships: content.match(/Relationships:([^#]*)/s)?.[1]?.trim() || '',
        supporting_evidence: content.match(/Supporting Evidence:([^#]*)/s)?.[1]?.trim() || ''
      };

      // Store or update the highlights
      const { error: upsertError } = await supabase
        .from('lecture_highlights')
        .upsert({
          lecture_id: lectureId,
          ...sections,
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        console.error('Error upserting highlights:', upsertError);
        throw new Error('Failed to store highlights');
      }

      return new Response(JSON.stringify({
        content: sections
      }), {
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

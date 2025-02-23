
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.error('OpenAI API key not configured');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { lectureId, part } = await req.json();
    console.log('Processing lecture ID:', lectureId, 'part:', part);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [lectureResult, configResult] = await Promise.all([
      supabase.from('lectures').select('content, title').eq('id', parseInt(lectureId!)).single(),
      supabase.from('lecture_ai_configs').select('*').eq('lecture_id', lectureId).maybeSingle()
    ]);

    if (lectureResult.error) throw lectureResult.error;
    if (!lectureResult.data?.content) throw new Error('No lecture content found');

    const lecture = lectureResult.data;
    const aiConfig = configResult.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.8,
      content_language: 'Romanian',
      custom_instructions: null
    };

    const analysisDepth = Math.ceil(aiConfig.detail_level * 8);
    const maxExamples = Math.ceil(aiConfig.detail_level * 6);
    
    let systemMessage = "";
    let userMessage = "";

    switch(part) {
      case 'part1':
        systemMessage = `You are an expert educational content analyzer. Create a JSON object with these exact keys: structure, keyConcepts, mainIdeas. Format the response as clean JSON without markdown formatting or code blocks. Do not include any text outside the JSON object.`;
        break;

      case 'part2':
        systemMessage = `You are an expert educational content analyzer. Create a JSON object with these exact keys: importantQuotes, relationships, supportingEvidence. Format the response as clean JSON without markdown formatting or code blocks. Do not include any text outside the JSON object.`;
        break;

      case 'full':
        systemMessage = `You are an expert educational content summarizer. Create a JSON object with a single key: fullContent. Format the response as clean JSON without markdown formatting or code blocks. Do not include any text outside the JSON object.`;
        break;

      default:
        throw new Error('Invalid part specified');
    }

    systemMessage += `\nAnalysis depth: ${analysisDepth}. Maximum examples per section: ${maxExamples}. Use ${aiConfig.content_language}.`;
    if (aiConfig.custom_instructions) {
      systemMessage += `\nAdditional requirements: ${aiConfig.custom_instructions}`;
    }

    console.log('Sending request to OpenAI...');
    
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
            content: systemMessage 
          },
          { 
            role: 'user', 
            content: `Title: ${lecture.title}\n\nContent:\n${lecture.content}`
          }
        ],
        temperature: aiConfig.temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('OpenAI Response Status:', response.status);
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI');
    }

    let rawContent = data.choices[0].message.content.trim();
    
    // Remove any markdown or code block markers
    rawContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsedContent = JSON.parse(rawContent);
      return new Response(JSON.stringify({ content: parsedContent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Parse error:', parseError, '\nRaw content:', rawContent);
      throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Error in generate-lecture-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
    console.log(`Generating summary for lecture ${lectureId}, part ${part}`);

    // Get the lecture content
    const { data: lectureData, error: lectureError } = await supabase
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .single();

    if (lectureError) throw new Error(`Error fetching lecture: ${lectureError.message}`);

    // Get AI configuration
    const { data: aiConfig, error: aiConfigError } = await supabase
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (aiConfigError) {
      console.error('Error fetching AI config:', aiConfigError);
    }

    // Use default values if no config exists
    const temperature = aiConfig?.temperature ?? 0.7;
    const creativityLevel = aiConfig?.creativity_level ?? 0.5;
    const detailLevel = aiConfig?.detail_level ?? 0.6;
    const customInstructions = aiConfig?.custom_instructions ?? '';
    const targetLanguage = aiConfig?.content_language;

    let systemPrompt = `You are an educational content analyzer. Generate a comprehensive summary of the lecture content. 
    Creativity Level: ${creativityLevel} - adjust your analysis style accordingly.
    Detail Level: ${detailLevel} - adjust the depth of your analysis.
    ${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}
    ${targetLanguage ? `Please provide the response in ${targetLanguage}.` : ''}`;

    let prompt = '';
    if (part === 'part1') {
      prompt = `Analyze the following lecture content and provide these sections:
      1. Structure: Outline the lecture's organization and flow
      2. Key Concepts: List and briefly explain the main concepts
      3. Main Ideas: Summarize the central arguments or points

      Use markdown formatting for the response.

      Lecture Title: ${lectureData.title}
      Content: ${lectureData.content}`;
    } else if (part === 'part2') {
      prompt = `Analyze the following lecture content and provide these sections:
      1. Important Quotes: Highlight significant quotations or statements
      2. Relationships: Explain connections between concepts
      3. Supporting Evidence: List examples, data, or evidence used

      Use markdown formatting for the response.

      Lecture Title: ${lectureData.title}
      Content: ${lectureData.content}`;
    } else {
      throw new Error('Invalid part specified');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: temperature,
      }),
    });

    const data = await response.json();
    console.log('OpenAI response received');

    const content = data.choices[0].message.content;
    let result = {};

    if (part === 'part1') {
      const sections = content.split(/(?=## )/);
      result = {
        structure: sections[0]?.trim() || '',
        keyConcepts: sections[1]?.replace(/^## Key Concepts:?/i, '').trim() || '',
        mainIdeas: sections[2]?.replace(/^## Main Ideas:?/i, '').trim() || ''
      };
    } else {
      const sections = content.split(/(?=## )/);
      result = {
        importantQuotes: sections[0]?.trim() || '',
        relationships: sections[1]?.replace(/^## Relationships:?/i, '').trim() || '',
        supportingEvidence: sections[2]?.replace(/^## Supporting Evidence:?/i, '').trim() || ''
      };
    }

    return new Response(JSON.stringify({ content: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

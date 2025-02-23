
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
    if (!lectureData?.content) throw new Error('No lecture content found');

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

    let systemPrompt = `You are an educational content analyzer. Generate a comprehensive summary of the lecture content with clear section headings.
    Format your response using markdown with ## for section headers.
    Creativity Level: ${creativityLevel} - adjust your analysis style accordingly.
    Detail Level: ${detailLevel} - adjust the depth of your analysis.
    ${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}
    ${targetLanguage ? `Please provide the response in ${targetLanguage}.` : ''}`;

    let prompt;
    if (part === 'part1') {
      prompt = `Analyze the following lecture content and provide a markdown-formatted analysis with exactly these sections:

## Structure
[Outline the lecture's organization and flow]

## Key Concepts
[List and briefly explain the main concepts]

## Main Ideas
[Summarize the central arguments or points]

Lecture Title: ${lectureData.title}
Content: ${lectureData.content}`;
    } else if (part === 'part2') {
      prompt = `Analyze the following lecture content and provide a markdown-formatted analysis with exactly these sections:

## Important Quotes
[Highlight significant quotations or statements]

## Relationships
[Explain connections between concepts]

## Supporting Evidence
[List examples, data, or evidence used]

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

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    console.log('Received content from OpenAI:', content);

    // Helper function to extract section content
    const extractSection = (text: string, sectionName: string): string => {
      const sections = text.split('##').filter(Boolean);
      const section = sections.find(s => s.trim().toLowerCase().startsWith(sectionName.toLowerCase()));
      if (!section) {
        console.warn(`Section ${sectionName} not found`);
        return '';
      }
      return section.replace(new RegExp(`^${sectionName}`, 'i'), '').trim();
    };

    let result;
    if (part === 'part1') {
      result = {
        structure: extractSection(content, 'Structure'),
        keyConcepts: extractSection(content, 'Key Concepts'),
        mainIdeas: extractSection(content, 'Main Ideas')
      };
    } else {
      result = {
        importantQuotes: extractSection(content, 'Important Quotes'),
        relationships: extractSection(content, 'Relationships'),
        supportingEvidence: extractSection(content, 'Supporting Evidence')
      };
    }

    console.log(`Successfully processed ${part}:`, result);

    return new Response(JSON.stringify({ content: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-lecture-summary:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

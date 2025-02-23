
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

    let systemPrompt = `You are an educational content analyzer. Generate a comprehensive summary of the lecture content.
Format your responses using markdown syntax with clear section headers.
Adjust your analysis based on:
- Creativity Level: ${creativityLevel} (higher means more creative explanations)
- Detail Level: ${detailLevel} (higher means more detailed analysis)
${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}
${targetLanguage ? `Please provide the response in ${targetLanguage}.` : ''}

Important: Always maintain proper markdown formatting for better readability.`;

    let userPrompt;
    if (part === 'part1') {
      userPrompt = `Analyze this lecture content and provide exactly these three sections:

## Structure
A clear outline of how the lecture content is organized.

## Key Concepts
The main terms, theories, or frameworks introduced.

## Main Ideas
The central arguments or key points presented.

Lecture: "${lectureData.title}"
Content: ${lectureData.content}`;
    } else if (part === 'part2') {
      userPrompt = `Analyze this lecture content and provide exactly these three sections:

## Important Quotes
The most significant statements or quotations.

## Relationships
Key connections between concepts.

## Supporting Evidence
Examples, data, or evidence used to support main points.

Lecture: "${lectureData.title}"
Content: ${lectureData.content}`;
    } else if (part === 'full') {
      userPrompt = `Provide a comprehensive summary of the entire lecture content, integrating all key points and maintaining clear organization.

Lecture: "${lectureData.title}"
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
          { role: 'user', content: userPrompt }
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

    console.log('Received content from OpenAI, processing response...');

    // Helper function to extract section content
    const extractSection = (text: string, sectionName: string): string => {
      const regex = new RegExp(`##\\s*${sectionName}([^#]*)(##|$)`, 'i');
      const match = text.match(regex);
      if (!match) {
        console.warn(`Section ${sectionName} not found`);
        return '';
      }
      return match[1].trim();
    };

    let result;
    if (part === 'part1') {
      result = {
        structure: extractSection(content, 'Structure'),
        keyConcepts: extractSection(content, 'Key Concepts'),
        mainIdeas: extractSection(content, 'Main Ideas')
      };
    } else if (part === 'part2') {
      result = {
        importantQuotes: extractSection(content, 'Important Quotes'),
        relationships: extractSection(content, 'Relationships'),
        supportingEvidence: extractSection(content, 'Supporting Evidence')
      };
    } else {
      result = {
        fullContent: content
      };
    }

    console.log(`Successfully processed ${part}:`, result);

    // Store the generated content in lecture_highlights
    if (part === 'part1' || part === 'part2') {
      const { error: upsertError } = await supabase
        .from('lecture_highlights')
        .upsert(
          {
            lecture_id: lectureId,
            ...result
          },
          { onConflict: 'lecture_id' }
        );

      if (upsertError) {
        console.error('Error storing highlights:', upsertError);
        throw upsertError;
      }
    }

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

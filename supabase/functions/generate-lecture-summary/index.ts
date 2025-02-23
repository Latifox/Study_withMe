
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

    // Get the lecture content and AI config
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
      throw new Error(`Error fetching lecture: ${lectureResult.error.message}`);
    }

    if (!lectureResult.data?.content) {
      throw new Error('No lecture content found');
    }

    // Use AI config if available, otherwise use defaults
    const aiConfig = aiConfigResult.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      content_language: null,
      custom_instructions: null
    };

    const systemPrompt = `You are an educational content analyzer. Generate a comprehensive summary of the lecture content.
Format your responses using markdown syntax with clear section headers.
Adjust your analysis based on:
- Creativity Level: ${aiConfig.creativity_level} (higher means more creative explanations)
- Detail Level: ${aiConfig.detail_level} (higher means more detailed analysis)
${aiConfig.custom_instructions ? `Additional Instructions: ${aiConfig.custom_instructions}` : ''}
${aiConfig.content_language ? `Please provide the response in ${aiConfig.content_language}.` : ''}

Important: Always maintain proper markdown formatting for better readability.`;

    let userPrompt;
    if (part === 'part1') {
      userPrompt = `Analyze this lecture content and provide exactly these three sections with markdown headers:

## Structure
A clear outline of how the lecture content is organized.

## Key Concepts
The main terms, theories, or frameworks introduced.

## Main Ideas
The central arguments or key points presented.

Lecture: "${lectureResult.data.title}"
Content: ${lectureResult.data.content}`;
    } else if (part === 'part2') {
      userPrompt = `Analyze this lecture content and provide exactly these three sections with markdown headers:

## Important Quotes
The most significant statements or quotations.

## Relationships
Key connections between concepts.

## Supporting Evidence
Examples, data, or evidence used to support main points.

Lecture: "${lectureResult.data.title}"
Content: ${lectureResult.data.content}`;
    } else if (part === 'full') {
      userPrompt = `Provide a comprehensive summary of the entire lecture content, integrating all key points and maintaining clear organization.

Lecture: "${lectureResult.data.title}"
Content: ${lectureResult.data.content}`;
    } else {
      throw new Error('Invalid part specified');
    }

    console.log('Sending request to OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: aiConfig.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
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
      return match ? match[1].trim() : '';
    };

    let result;
    let highlightsUpdate = {};

    if (part === 'part1') {
      result = {
        structure: extractSection(content, 'Structure'),
        key_concepts: extractSection(content, 'Key Concepts'),
        main_ideas: extractSection(content, 'Main Ideas')
      };
      highlightsUpdate = result;
    } else if (part === 'part2') {
      result = {
        important_quotes: extractSection(content, 'Important Quotes'),
        relationships: extractSection(content, 'Relationships'),
        supporting_evidence: extractSection(content, 'Supporting Evidence')
      };
      highlightsUpdate = result;
    } else {
      result = {
        fullContent: content
      };
    }

    console.log(`Successfully processed ${part}`);

    // Store the generated content in lecture_highlights
    if (part === 'part1' || part === 'part2') {
      // First check if a record exists
      const { data: existingHighlight } = await supabase
        .from('lecture_highlights')
        .select('id')
        .eq('lecture_id', lectureId)
        .maybeSingle();

      if (existingHighlight) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('lecture_highlights')
          .update(highlightsUpdate)
          .eq('lecture_id', lectureId);

        if (updateError) {
          console.error('Error updating highlights:', updateError);
          throw updateError;
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('lecture_highlights')
          .insert({
            lecture_id: lectureId,
            ...highlightsUpdate
          });

        if (insertError) {
          console.error('Error inserting highlights:', insertError);
          throw insertError;
        }
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

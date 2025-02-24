
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
    const { lectureId, part } = await req.json();
    console.log('Processing request for lecture:', lectureId, 'part:', part);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      if (part === 'part1') {
        return new Response(JSON.stringify({
          content: {
            structure: existingHighlights.structure || '',
            keyConcepts: existingHighlights.key_concepts || '',
            mainIdeas: existingHighlights.main_ideas || ''
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (part === 'part2') {
        return new Response(JSON.stringify({
          content: {
            importantQuotes: existingHighlights.important_quotes || '',
            relationships: existingHighlights.relationships || '',
            supportingEvidence: existingHighlights.supporting_evidence || ''
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // If no existing highlights, fetch lecture content and AI config
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    // Get AI configuration
    const { data: aiConfig } = await supabase
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .single();

    console.log('Successfully fetched lecture content');

    let systemPrompt = `You are an expert educational content analyzer. Your task is to provide a comprehensive, well-structured analysis of the lecture content. IMPORTANT: You must provide exactly three sections in your response, clearly separated by '## ' markdown headers. Each section must be non-empty and properly formatted with markdown.`;

    if (part === 'part1') {
      systemPrompt += `
      Provide these exact three sections with these exact titles:

      ## Structure
      Provide a detailed hierarchical outline of the content using bullet points and numbering.

      ## Key Concepts
      Define and explain key concepts using bullet points and bold text for important terms.

      ## Main Ideas
      Present main ideas with supporting details using bullet points and numbered lists.`;
    } else if (part === 'part2') {
      systemPrompt += `
      Provide these exact three sections with these exact titles:

      ## Important Quotes
      Use proper blockquote formatting (>) for quotes with explanations.

      ## Relationships
      Detail connections between concepts using bullet points.

      ## Supporting Evidence
      List and analyze evidence using bullet points and numbered lists.`;
    }

    if (aiConfig?.custom_instructions) {
      systemPrompt += `\n\nAdditional instructions: ${aiConfig.custom_instructions}`;
    }
    if (aiConfig?.content_language) {
      systemPrompt += `\n\nPlease provide the content in: ${aiConfig.content_language}`;
    }

    console.log('Sending request to OpenAI');

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
          { role: 'user', content: lecture.content }
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
    console.log('Generated content:', content.substring(0, 200) + '...');

    // Parse the markdown content into sections, ensuring we get exactly 3
    const sections = content.split(/(?=## )/g)
      .filter(section => section.trim())
      .map(section => section.replace(/^## /, '').trim());

    console.log(`Found ${sections.length} sections in the response`);

    if (sections.length !== 3) {
      console.error('Invalid sections:', sections);
      throw new Error(`Invalid number of sections in response. Expected 3, got ${sections.length}.`);
    }

    let dbUpdate = {};
    let response = { content: {} };

    if (part === 'part1') {
      response.content = {
        structure: sections[0],
        keyConcepts: sections[1],
        mainIdeas: sections[2]
      };

      dbUpdate = {
        lecture_id: lectureId,
        structure: sections[0],
        key_concepts: sections[1],
        main_ideas: sections[2]
      };
    } else if (part === 'part2') {
      response.content = {
        importantQuotes: sections[0],
        relationships: sections[1],
        supportingEvidence: sections[2]
      };

      dbUpdate = {
        lecture_id: lectureId,
        important_quotes: sections[0],
        relationships: sections[1],
        supporting_evidence: sections[2]
      };
    }

    // Store or update the highlights
    if (existingHighlights) {
      const { error: updateError } = await supabase
        .from('lecture_highlights')
        .update(dbUpdate)
        .eq('lecture_id', lectureId);

      if (updateError) {
        console.error('Error updating highlights:', updateError);
        throw new Error('Failed to update highlights in database');
      }
    } else {
      const { error: insertError } = await supabase
        .from('lecture_highlights')
        .insert([dbUpdate]);

      if (insertError) {
        console.error('Error inserting highlights:', insertError);
        throw new Error('Failed to store highlights in database');
      }
    }

    console.log(`Successfully processed and stored content for ${part}`);

    return new Response(JSON.stringify(response), {
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

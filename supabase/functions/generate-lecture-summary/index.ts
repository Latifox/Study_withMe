
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      throw new Error('OpenAI API key is not configured');
    }

    // Fetch the AI configuration for this lecture
    const { data: aiConfig, error: aiConfigError } = await supabase
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (aiConfigError) {
      console.error('Error fetching AI config:', aiConfigError);
      throw new Error('Failed to fetch AI configuration');
    }

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

    // If no existing highlights, fetch lecture content
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    if (!lecture.content) {
      throw new Error('Lecture content is empty');
    }

    console.log('Successfully fetched lecture content');

    const systemPrompt = `You are an expert educational content analyst. Your task is to analyze and summarize lecture content with rich detail. Provide clear, structured insights using markdown formatting.

${part === 'part1' ? `Focus on:
- Overall structure and organization
- Key theoretical concepts and definitions
- Main ideas and themes` :
`Focus on:
- Important quotes and their context
- Relationships between concepts
- Evidence supporting main arguments`}

Use markdown formatting including:
- Lists and bullet points
- Bold text for emphasis
- Blockquotes for important text
- Clear section headers (##)
- Proper spacing and organization

${aiConfig?.custom_instructions ? `\nAdditional instructions: ${aiConfig.custom_instructions}` : ''}
${aiConfig?.content_language ? `\nProvide content in: ${aiConfig.content_language}` : ''}`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
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
      const errorText = await openAIResponse.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error('Failed to generate content: OpenAI API error');
    }

    const data = await openAIResponse.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response format:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    const content = data.choices[0].message.content.trim();
    console.log('Generated content length:', content.length);

    // Split content into sections
    const sections = content
      .split('##')
      .filter(Boolean)
      .map(s => s.trim());

    console.log(`Found ${sections.length} sections in the response`);

    const section1 = sections[0] || '';
    const section2 = sections[1] || '';
    const section3 = sections[2] || '';

    // Prepare response and database update based on part
    let responseData, dbUpdate;

    if (part === 'part1') {
      responseData = {
        content: {
          structure: section1,
          keyConcepts: section2,
          mainIdeas: section3
        }
      };

      dbUpdate = {
        lecture_id: lectureId,
        structure: section1,
        key_concepts: section2,
        main_ideas: section3
      };
    } else {
      responseData = {
        content: {
          importantQuotes: section1,
          relationships: section2,
          supportingEvidence: section3
        }
      };

      dbUpdate = {
        lecture_id: lectureId,
        important_quotes: section1,
        relationships: section2,
        supporting_evidence: section3
      };
    }

    // Store the highlights
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

    return new Response(JSON.stringify(responseData), {
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

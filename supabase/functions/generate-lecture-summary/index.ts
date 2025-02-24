
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the lecture content
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .single();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    console.log('Lecture title:', lecture.title);
    console.log('Content length:', lecture.content?.length ?? 0);

    if (!lecture.content) {
      throw new Error('No lecture content found');
    }

    // Generate highlights
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
            content: `You are an expert educational content analyzer. Your task is to analyze the lecture content and provide a detailed analysis in exactly 6 sections. Each section MUST start with its title followed by a colon and a line break. The sections MUST be in this exact order:

1. Structure: Analyze how the content is organized and structured
2. Key Concepts: List and explain the most important concepts
3. Main Ideas: Analyze the central themes and main points
4. Important Quotes: Extract and list notable quotes
5. Relationships: Analyze connections between different concepts
6. Supporting Evidence: Analyze the evidence used to support main points

Format your response exactly like this:

Structure:
[Your detailed analysis of the structure]

Key Concepts:
[Your detailed list and explanation of key concepts]

Main Ideas:
[Your detailed analysis of main ideas]

Important Quotes:
[Your detailed list of notable quotes]

Relationships:
[Your detailed analysis of relationships]

Supporting Evidence:
[Your detailed analysis of supporting evidence]

IMPORTANT: Make sure each section is substantial and not empty.`
          },
          {
            role: 'user',
            content: `Title: ${lecture.title}\n\nContent: ${lecture.content}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      throw new Error('Failed to generate highlights');
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    console.log('Generated content length:', content.length);

    // Parse the sections using more precise regex
    const sections = {
      structure: content.match(/Structure:\n([\s\S]*?)(?=\n\nKey Concepts:)/)?.[1]?.trim() || '',
      key_concepts: content.match(/Key Concepts:\n([\s\S]*?)(?=\n\nMain Ideas:)/)?.[1]?.trim() || '',
      main_ideas: content.match(/Main Ideas:\n([\s\S]*?)(?=\n\nImportant Quotes:)/)?.[1]?.trim() || '',
      important_quotes: content.match(/Important Quotes:\n([\s\S]*?)(?=\n\nRelationships:)/)?.[1]?.trim() || '',
      relationships: content.match(/Relationships:\n([\s\S]*?)(?=\n\nSupporting Evidence:)/)?.[1]?.trim() || '',
      supporting_evidence: content.match(/Supporting Evidence:\n([\s\S]*?)$/)?.[1]?.trim() || ''
    };

    // Log the parsed sections
    console.log('Parsed sections:', Object.keys(sections).map(key => `${key}: ${sections[key].length} chars`));

    // Verify that no section is empty
    const emptySections = Object.entries(sections)
      .filter(([_, content]) => !content)
      .map(([key]) => key);

    if (emptySections.length > 0) {
      console.error('Empty sections detected:', emptySections);
      throw new Error(`Generation failed: Empty sections detected: ${emptySections.join(', ')}`);
    }

    // Store the highlights
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

    return new Response(JSON.stringify({ content: sections }), {
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


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId } = await req.json();
    console.log('Generating story structure for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch subject content mappings, subjects, and AI config
    const [subjectsData, aiConfig] = await Promise.all([
      supabaseClient
        .from('subject_definitions')
        .select(`
          id,
          title,
          chronological_order,
          subject_content_mapping (
            content_snippet,
            relevance_score
          )
        `)
        .eq('lecture_id', lectureId)
        .order('chronological_order', { ascending: true }),
      supabaseClient
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .maybeSingle()
    ]);

    if (subjectsData.error) throw subjectsData.error;

    const config = aiConfig.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6
    };

    // Group subjects into 10 segments based on chronological order and content
    const subjects = subjectsData.data;
    console.log(`Found ${subjects.length} subjects with content mappings`);

    // Generate segment titles based on subjects and their content
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate exactly 10 clear, descriptive segment titles based on the provided subjects and their content.'
          },
          {
            role: 'user',
            content: `Using these subjects and their extracted content, generate 10 segment titles that follow a logical progression:

Subjects and their content:
${subjects.map(subject => `
Subject: ${subject.title}
Content:
${subject.subject_content_mapping.map(mapping => 
  `- ${mapping.content_snippet} (Relevance: ${mapping.relevance_score})`
).join('\n')}
`).join('\n')}

AI Configuration Settings:
- Temperature: ${config.temperature}
- Creativity Level: ${config.creativity_level}
- Detail Level: ${config.detail_level}

Rules for titles:
1. Each title must be based on the actual content provided
2. Maintain strict chronological order based on subject order
3. Each title should clearly indicate the progression level
4. No repetition of concepts between segments
5. Use professional, academic language
6. Titles must reflect the actual content available

Return a JSON object with exactly 10 numbered titles in this format:
{
  "segment_1_title": "Introduction to [Topic]",
  "segment_2_title": "Basic Concepts and Definitions",
  ...
  "segment_10_title": "Advanced Applications"
}`
          }
        ],
        temperature: config.temperature,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const titles = JSON.parse(data.choices[0].message.content);

    if (!titles || Object.keys(titles).length !== 10) {
      throw new Error('Invalid titles object - must have exactly 10 segments');
    }

    // Store the story structure
    const { data: storyStructure, error: storyError } = await supabaseClient
      .from('story_structures')
      .insert([{
        lecture_id: lectureId,
        ...titles
      }])
      .select()
      .single();

    if (storyError) throw storyError;

    console.log('Successfully created story structure with titles');

    return new Response(
      JSON.stringify({ storyStructure }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-story-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

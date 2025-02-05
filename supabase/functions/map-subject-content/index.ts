
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    console.log('Received request for lecture:', lectureId);

    if (!lectureId) {
      throw new Error('Lecture ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching lecture content, subjects, and AI config...');

    // Fetch lecture content, subjects, and AI config
    const [lectureResult, subjectsResult, aiConfigResult] = await Promise.all([
      supabaseClient
        .from('lectures')
        .select('content')
        .eq('id', lectureId)
        .single(),
      supabaseClient
        .from('subject_definitions')
        .select('*')
        .eq('lecture_id', lectureId)
        .order('chronological_order', { ascending: true }),
      supabaseClient
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .maybeSingle()
    ]);

    if (lectureResult.error) throw lectureResult.error;
    if (subjectsResult.error) throw subjectsResult.error;
    if (aiConfigResult.error) throw aiConfigResult.error;
    if (!lectureResult.data?.content) {
      throw new Error('Lecture content not found');
    }

    const content = lectureResult.data.content;
    const subjects = subjectsResult.data;
    const aiConfig = aiConfigResult.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6
    };

    console.log(`Found ${subjects.length} subjects to process with AI config:`, aiConfig);

    // Delete existing mappings
    if (subjects.length > 0) {
      console.log('Deleting existing mappings...');
      const { error: deleteError } = await supabaseClient
        .from('subject_content_mapping')
        .delete()
        .in('subject_id', subjects.map(s => s.id));

      if (deleteError) throw deleteError;
    }

    // Use OpenAI to analyze content for each subject
    const mappings = [];
    for (const subject of subjects) {
      console.log(`Processing subject: ${subject.title}`);
      
      const prompt = `Analyze this lecture content and extract ONLY the most relevant, non-redundant content specifically related to the subject "${subject.title}". 
      
IMPORTANT INSTRUCTIONS:
1. If provided, strictly follow these additional details about the subject: ${subject.details || 'none provided'}.
2. DO NOT invent, extrapolate, or add any information not present in the source material.
3. Only extract text that is EXPLICITLY related to this subject.
4. Ensure extracted content maintains proper context.
5. Include relevant formulas and examples ONLY if they appear in the original text.

AI Configuration settings to consider:
- Temperature: ${aiConfig.temperature} (higher means more creative analysis)
- Creativity Level: ${aiConfig.creativity_level} (higher means more innovative connections)
- Detail Level: ${aiConfig.detail_level} (higher means more comprehensive content selection)

Lecture content:
${content}

Return a JSON array of objects, each containing:
{
  "content_snippet": "the extracted relevant text",
  "relevance_score": (number between 0 and 1 indicating relevance),
  "start_index": (position in original text),
  "end_index": (position in original text)
}

Include only the most relevant, non-redundant content. Avoid duplicate information.`;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are an expert at analyzing educational content and extracting relevant information. You return only valid JSON arrays.'
              },
              { role: 'user', content: prompt }
            ],
            temperature: aiConfig.temperature,
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const contentAnalysis = JSON.parse(data.choices[0].message.content);

        // Add mappings from AI analysis
        contentAnalysis.forEach(analysis => {
          mappings.push({
            subject_id: subject.id,
            content_start_index: analysis.start_index,
            content_end_index: analysis.end_index,
            content_snippet: analysis.content_snippet,
            relevance_score: analysis.relevance_score
          });
        });

      } catch (error) {
        console.error(`Error processing subject ${subject.title}:`, error);
        throw error;
      }
    }

    console.log(`Generated ${mappings.length} content mappings`);

    if (mappings.length > 0) {
      console.log('Inserting new mappings...');
      const { error: mappingError } = await supabaseClient
        .from('subject_content_mapping')
        .insert(mappings);

      if (mappingError) throw mappingError;
    }

    return new Response(
      JSON.stringify({ success: true, mappingsCount: mappings.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in map-subject-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

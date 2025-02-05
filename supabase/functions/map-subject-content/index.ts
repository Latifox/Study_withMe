
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

    if (!lectureId) {
      throw new Error('Lecture ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content and subjects
    const [lectureResult, subjectsResult] = await Promise.all([
      supabaseClient
        .from('lectures')
        .select('content')
        .eq('id', lectureId)
        .single(),
      supabaseClient
        .from('subject_definitions')
        .select('*')
        .eq('lecture_id', lectureId)
        .order('chronological_order', { ascending: true })
    ]);

    if (lectureResult.error) throw lectureResult.error;
    if (subjectsResult.error) throw subjectsResult.error;
    if (!lectureResult.data?.content) throw new Error('Lecture content not found');

    const content = lectureResult.data.content;
    const subjects = subjectsResult.data;

    // Delete existing mappings
    await supabaseClient
      .from('subject_content_mapping')
      .delete()
      .in('subject_id', subjects.map(s => s.id));

    // Create mappings for each subject
    const mappings = [];
    for (const subject of subjects) {
      // Simple relevance calculation based on keyword matching
      // In a production environment, you might want to use more sophisticated NLP techniques
      const keywords = [subject.title, ...(subject.details?.split(/\s+/) || [])].filter(Boolean);
      const contentLines = content.split('\n');
      
      let currentSegment = {
        startIndex: 0,
        endIndex: 0,
        text: '',
        score: 0
      };

      for (let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i];
        const matchScore = keywords.reduce((score, keyword) => {
          const regex = new RegExp(keyword, 'gi');
          const matches = (line.match(regex) || []).length;
          return score + matches;
        }, 0);

        if (matchScore > 0) {
          if (currentSegment.text === '') {
            currentSegment.startIndex = i;
          }
          currentSegment.endIndex = i;
          currentSegment.text += line + '\n';
          currentSegment.score += matchScore;
        } else if (currentSegment.text !== '') {
          mappings.push({
            subject_id: subject.id,
            content_start_index: currentSegment.startIndex,
            content_end_index: currentSegment.endIndex,
            content_snippet: currentSegment.text.trim(),
            relevance_score: currentSegment.score / keywords.length
          });
          currentSegment = { startIndex: 0, endIndex: 0, text: '', score: 0 };
        }
      }

      // Add final segment if exists
      if (currentSegment.text !== '') {
        mappings.push({
          subject_id: subject.id,
          content_start_index: currentSegment.startIndex,
          content_end_index: currentSegment.endIndex,
          content_snippet: currentSegment.text.trim(),
          relevance_score: currentSegment.score / keywords.length
        });
      }
    }

    if (mappings.length > 0) {
      const { error: mappingError } = await supabaseClient
        .from('subject_content_mapping')
        .insert(mappings);

      if (mappingError) throw mappingError;
    }

    return new Response(
      JSON.stringify({ success: true, mappingsCount: mappings.length }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in map-subject-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

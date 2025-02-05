
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

    // Fetch polished chunks
    const { data: chunks, error: chunksError } = await supabaseClient
      .from('lecture_polished_chunks')
      .select('*')
      .eq('lecture_id', lectureId)
      .order('chunk_order', { ascending: true });

    if (chunksError) throw chunksError;
    console.log(`Found ${chunks?.length || 0} polished chunks`);

    if (!chunks || chunks.length === 0) {
      throw new Error('No lecture chunks found');
    }

    // Process chunks in pairs to generate titles
    const chunksPrompts = [];
    for (let i = 0; i < chunks.length; i += 2) {
      const chunk1 = chunks[i];
      const chunk2 = chunks[i + 1];
      
      if (chunk2) {
        chunksPrompts.push(`Chunk ${i + 1} content: ${chunk1.polished_content}\nChunk ${i + 2} content: ${chunk2.polished_content}`);
      } else {
        chunksPrompts.push(`Chunk ${i + 1} content: ${chunk1.polished_content}`);
      }
    }

    // Generate segment titles based on chunk pairs
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
            content: `You are an expert in creating educational content structures. Generate descriptive titles that accurately summarize the academic content from each pair of text chunks. Each title should:
1. Be highly specific to the actual content in the chunks
2. Use appropriate academic terminology found in the chunks
3. Follow a natural learning progression
4. Be concise but informative
5. Focus ONLY on the subject matter present in the chunks`
          },
          {
            role: 'user',
            content: `Based on these pairs of polished content chunks from a lecture, generate a descriptive title for each pair that captures their combined meaning:

${chunksPrompts.map((prompt, index) => `Pair ${index + 1}:\n${prompt}\n`).join('\n')}

Return a JSON object with numbered titles (one per chunk pair) in this format:
{
  "segment_1_title": "Introduction to [Topic]",
  "segment_2_title": "Basic Concepts and Definitions",
  ...
}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const titles = JSON.parse(data.choices[0].message.content);

    console.log('Generated titles:', titles);

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

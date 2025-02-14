
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
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': Deno.env.get('GOOGLE_API_KEY') || '',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'system',
            parts: [{
              text: `Generate segment titles and content in the same language as the provided lecture. Focus on accuracy and relevance to the lecture content. Ensure the content is detailed, with a clear and friendly tone. Focus only on information from the lecture to ensure accuracy and relevance.

Based on these pairs of polished content chunks from a lecture, generate a descriptive title for each pair that captures their combined meaning. Each title should:
1. Maintain the original language of the lecture
2. Be highly specific to the actual content in the chunks
3. Use appropriate academic terminology found in the chunks
4. Follow a natural learning progression
5. Be concise but informative
6. Focus ONLY on the subject matter present in the chunks

Lecture chunks to process:

${chunksPrompts.map((prompt, index) => `Pair ${index + 1}:\n${prompt}\n`).join('\n')}

Return a JSON object with numbered titles (one per chunk pair) in this format:
{
  "segment_1_title": "Introduction to [Topic]",
  "segment_2_title": "Basic Concepts and Definitions",
  ...
}`
            }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const titles = JSON.parse(data.candidates[0].content.parts[0].text);

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

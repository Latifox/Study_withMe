import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Further reduced chunk size and increased delay for better resource management
const CHUNK_SIZE = 1500;
const OVERLAP = 50;
const DELAY_BETWEEN_CALLS = 2000; // 2 seconds delay

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId } = await req.json();
    console.log(`Starting to process lecture ID: ${lectureId}`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture?.content) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    console.log(`Retrieved lecture: ${lecture.title}`);

    // Split content into smaller chunks
    const chunks = [];
    let startIndex = 0;
    while (startIndex < lecture.content.length) {
      const endIndex = Math.min(startIndex + CHUNK_SIZE, lecture.content.length);
      chunks.push(lecture.content.slice(startIndex, endIndex));
      startIndex = endIndex - OVERLAP;
    }

    console.log(`Content split into ${chunks.length} chunks`);

    // Process chunks with increased delay and better error handling
    const chunkSummaries = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Starting chunk ${i + 1}/${chunks.length}`);
      
      try {
        // Add increased delay between API calls
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS));
        }

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
                content: 'Create a brief, focused summary highlighting only the main points and key concepts.'
              },
              {
                role: 'user',
                content: `Summarize this section (${i + 1}/${chunks.length}) of "${lecture.title}":\n\n${chunks[i]}`
              }
            ],
            max_tokens: 300,
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        chunkSummaries.push(data.choices[0].message.content);
        console.log(`Successfully processed chunk ${i + 1}`);
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error);
        throw new Error(`Failed to process chunk ${i + 1}: ${error.message}`);
      }
    }

    // Final consolidation with minimal processing
    console.log('Starting final summary consolidation');
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
            content: 'Create a brief, coherent summary combining the provided sections.'
          },
          {
            role: 'user',
            content: `Combine these summaries into one concise overview:\n\n${chunkSummaries.join('\n\n')}`
          }
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error in final summary: ${response.status}`);
    }

    const finalSummary = await response.json();
    console.log('Successfully generated final summary');

    return new Response(
      JSON.stringify({
        summary: finalSummary.choices[0].message.content
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-lecture-summary function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
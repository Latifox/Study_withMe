import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHUNK_SIZE = 4000; // Characters per chunk
const OVERLAP = 200; // Overlap between chunks to maintain context

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId } = await req.json();

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
      throw new Error('Failed to fetch lecture content');
    }

    console.log(`Processing lecture: ${lecture.title}`);

    // Split content into overlapping chunks
    const chunks = [];
    let startIndex = 0;
    while (startIndex < lecture.content.length) {
      const endIndex = Math.min(startIndex + CHUNK_SIZE, lecture.content.length);
      chunks.push(lecture.content.slice(startIndex, endIndex));
      startIndex = endIndex - OVERLAP;
    }

    console.log(`Split content into ${chunks.length} chunks`);

    // Process each chunk sequentially
    const chunkSummaries = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
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
              content: `You are an expert at summarizing academic content. Your task is to create a clear, 
              well-structured summary of a portion of lecture content. Focus on:
              1. Key concepts and main ideas
              2. Important relationships between concepts
              3. Significant examples or case studies
              4. Core arguments or theoretical frameworks
              
              If this is part of a larger text, maintain context awareness and avoid redundancy.
              Be concise but comprehensive.`
            },
            {
              role: 'user',
              content: `This is ${i === 0 ? 'the beginning' : i === chunks.length - 1 ? 'the end' : 'a middle section'} 
              of a lecture titled "${lecture.title}". Please summarize this section:\n\n${chunks[i]}`
            }
          ],
        }),
      });

      const data = await response.json();
      chunkSummaries.push(data.choices[0].message.content);
    }

    // Final pass to combine and refine all summaries
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
            content: `You are an expert at creating cohesive summaries from multiple sections. Your task is to:
            1. Combine multiple section summaries into one flowing narrative
            2. Eliminate redundancies while preserving all unique information
            3. Ensure logical flow and connections between ideas
            4. Structure the final summary with clear sections and bullet points where appropriate
            5. Maintain academic rigor while being accessible`
          },
          {
            role: 'user',
            content: `Here are summaries of different sections of a lecture titled "${lecture.title}". 
            Please combine them into one coherent, well-structured summary:\n\n${chunkSummaries.join('\n\n')}`
          }
        ],
      }),
    });

    const finalSummary = await response.json();

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
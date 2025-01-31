import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reduced chunk size and overlap for better resource management
const CHUNK_SIZE = 2000;
const OVERLAP = 100;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId } = await req.json();
    console.log(`Processing lecture ID: ${lectureId}`);

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

    // Split content into smaller chunks
    const chunks = [];
    let startIndex = 0;
    while (startIndex < lecture.content.length) {
      const endIndex = Math.min(startIndex + CHUNK_SIZE, lecture.content.length);
      chunks.push(lecture.content.slice(startIndex, endIndex));
      startIndex = endIndex - OVERLAP;
    }

    console.log(`Split content into ${chunks.length} chunks`);

    // Process chunks with delay between calls to prevent resource exhaustion
    const chunkSummaries = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
      // Add delay between API calls to prevent overload
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
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
              content: `You are an expert at creating concise, informative summaries of academic content. Focus on:
              1. Key concepts and main ideas
              2. Important relationships between concepts
              3. Core arguments or theoretical frameworks
              
              Keep the summary clear and well-structured. If this is part of a larger text, maintain context awareness.`
            },
            {
              role: 'user',
              content: `This is ${i === 0 ? 'the beginning' : i === chunks.length - 1 ? 'the end' : 'a middle section'} 
              of a lecture titled "${lecture.title}". Please summarize this section concisely:\n\n${chunks[i]}`
            }
          ],
          max_tokens: 500, // Limit response size
          temperature: 0.3, // More focused responses
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      chunkSummaries.push(data.choices[0].message.content);
    }

    // Final consolidation with a smaller prompt
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
            content: `Create a cohesive final summary from the provided section summaries. Focus on main points and maintain clarity.`
          },
          {
            role: 'user',
            content: `Combine these summaries of "${lecture.title}" into one coherent summary:\n\n${chunkSummaries.join('\n\n')}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

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
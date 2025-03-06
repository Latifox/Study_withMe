
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
    const { lectureId, count = 3 } = await req.json();
    console.log('Generating flashcards for lecture:', lectureId, 'count:', count);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content and AI config
    const [{ data: lecture, error: lectureError }, { data: config }] = await Promise.all([
      supabaseClient
        .from('lectures')
        .select('content')
        .eq('id', lectureId)
        .single(),
      supabaseClient
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .single()
    ]);

    if (lectureError || !lecture?.content) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    const aiConfig = config || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      custom_instructions: ''
    };

    console.log('Successfully fetched lecture content and AI config');

    // Check if OpenAI API key is available
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      throw new Error('OpenAI API key is not configured');
    }

    // Generate flashcards using OpenAI
    console.log('Calling OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates flashcards based on lecture content. Each flashcard should have a clear question and answer pair.'
          },
          {
            role: 'user',
            content: `Generate exactly ${count} flashcards based on this lecture content:\n\n${lecture.content}\n\n` +
                    `Format each flashcard as:\nQuestion: [your question here]\nAnswer: [your answer here]\n\n` +
                    `Adjust output based on these parameters:\n` +
                    `- Creativity Level: ${aiConfig.creativity_level}\n` +
                    `- Detail Level: ${aiConfig.detail_level}`
          }
        ],
        temperature: aiConfig.temperature,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Raw OpenAI response:', data);

    const content = data.choices[0].message.content;
    
    // Parse the response to extract flashcards
    const flashcards = content.split('\n\n')
      .filter((card: string) => card.trim())
      .map((card: string) => {
        const [question, answer] = card.split('\nAnswer: ');
        return {
          question: question.replace('Question: ', '').trim(),
          answer: answer?.trim() || ''
        };
      })
      .filter((card: { question: string, answer: string }) => 
        card.question && card.answer
      );

    console.log('Returning flashcards:', flashcards.length);

    return new Response(
      JSON.stringify({ flashcards }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating flashcards:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

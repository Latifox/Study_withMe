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

    const systemMessage = `You are a flashcard generator. Generate exactly ${count} flashcards based on the provided lecture content. 
    Each flashcard should have a question on one side and the answer on the other side.
    
    Adjust your output based on these parameters:
    - Creativity Level: ${aiConfig.creativity_level} (higher means more creative and unique questions)
    - Detail Level: ${aiConfig.detail_level} (higher means more detailed answers)
    
    ${aiConfig.custom_instructions ? `Additional instructions:\n${aiConfig.custom_instructions}` : ''}
    
    Format each flashcard as:
    Question: [your question here]
    Answer: [your answer here]`;

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
            content: systemMessage
          },
          {
            role: 'user',
            content: lecture.content
          }
        ],
        temperature: aiConfig.temperature,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully generated flashcards from OpenAI');

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
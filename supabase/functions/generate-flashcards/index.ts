
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

    // Generate flashcards using Gemini
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': Deno.env.get('GOOGLE_API_KEY') || '',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{
              text: `Generate exactly ${count} flashcards based on this lecture content:\n\n${lecture.content}\n\n` +
                    `Format each flashcard as:\nQuestion: [your question here]\nAnswer: [your answer here]\n\n` +
                    `Adjust output based on these parameters:\n` +
                    `- Creativity Level: ${aiConfig.creativity_level}\n` +
                    `- Detail Level: ${aiConfig.detail_level}`
            }]
          }
        ],
        generationConfig: {
          temperature: aiConfig.temperature,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      console.error('Google API error:', response.status);
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw Gemini response:', data);

    const content = data.candidates[0].content.parts[0].text;
    
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

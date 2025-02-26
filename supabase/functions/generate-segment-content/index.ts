
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { validateGeneratedContent } from './validator.ts';
import { generatePrompt } from './generator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting segment content generation...');

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('Missing OpenAI API key');
    }

    const { 
      lectureId,
      segmentNumber,
      segmentTitle,
      segmentDescription,
      lectureContent,
      contentLanguage = 'english'
    } = await req.json();

    if (!lectureId || !segmentNumber || !segmentTitle || !lectureContent) {
      console.error('Missing required parameters:', { 
        lectureId, 
        segmentNumber, 
        segmentTitle, 
        lectureContent 
      });
      throw new Error('Missing required parameters');
    }

    console.log('Processing parameters:', {
      lectureId,
      segmentNumber,
      segmentTitle,
      hasDescription: !!segmentDescription,
      contentLanguage
    });

    // Generate the prompt using the imported function
    const prompt = generatePrompt({
      segmentTitle,
      segmentDescription,
      lectureContent,
      contentLanguage
    });

    console.log('Sending request to OpenAI...');

    // Make the request to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an educational content generator. Provide responses only in valid JSON format.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Unexpected OpenAI response format:', data);
      throw new Error('Invalid response from OpenAI');
    }

    let content;
    try {
      content = JSON.parse(data.choices[0].message.content.trim());
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.error('Raw response:', data.choices[0].message.content);
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    // Validate the generated content
    validateGeneratedContent(content);

    // Extra validation for quiz_2_correct_answer
    if (typeof content.quiz_2_correct_answer !== 'boolean') {
      console.error('quiz_2_correct_answer is not boolean');
      throw new Error('Generated content invalid: quiz_2_correct_answer must be boolean');
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the generated content
    const { error: insertError } = await supabase
      .from('segments_content')
      .upsert({
        lecture_id: lectureId,
        sequence_number: segmentNumber,
        theory_slide_1: content.theory_slide_1,
        theory_slide_2: content.theory_slide_2,
        quiz_1_type: content.quiz_1_type,
        quiz_1_question: content.quiz_1_question,
        quiz_1_options: content.quiz_1_options,
        quiz_1_correct_answer: content.quiz_1_correct_answer,
        quiz_1_explanation: content.quiz_1_explanation,
        quiz_2_type: content.quiz_2_type,
        quiz_2_question: content.quiz_2_question,
        quiz_2_correct_answer: content.quiz_2_correct_answer,
        quiz_2_explanation: content.quiz_2_explanation
      });

    if (insertError) {
      console.error(`Error storing content:`, insertError);
      throw insertError;
    }

    console.log('Successfully stored segment content');

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-segment-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

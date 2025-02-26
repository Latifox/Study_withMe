
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type GenerateContentRequest = {
  lectureId: number;
  segmentNumber: number;
  segmentTitle: string;
  segmentDescription: string;
  lectureContent: string;
  contentLanguage: string;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent, contentLanguage } = await req.json() as GenerateContentRequest;

    if (!lectureId || !segmentTitle || !segmentDescription || !lectureContent) {
      throw new Error('Missing required fields');
    }

    console.log('Generating content for:', { lectureId, segmentNumber, segmentTitle });

    // Generate the content using OpenAI
    const systemPrompt = `You are a knowledgeable instructor creating educational content in ${contentLanguage}. Follow these guidelines strictly:
      1. Create theory slides between 150-350 words.
      2. Present detailed, accurate information without citing external sources.
      3. Use proper Markdown formatting for better readability.
      4. Make content engaging and direct.
      5. Focus on explaining concepts clearly.`;

    const theoryPrompt = `Create two theory slides about "${segmentTitle}" based on this description: "${segmentDescription}".
      Context from lecture: "${lectureContent}"
      
      Follow these requirements strictly:
      - Each slide should be 150-350 words
      - Use proper Markdown formatting
      - Be detailed but don't cite external sources
      - Break down complex concepts into digestible points
      - Focus on clear, direct explanations
      - Write in ${contentLanguage}`;

    const quizPrompt = `Create two quiz questions about "${segmentTitle}" based on the theory content.
      
      For Quiz 1:
      - Create a multiple-choice question with 4 options
      - Make it challenging but fair
      - Include a clear explanation for the correct answer
      - Write in ${contentLanguage}
      
      For Quiz 2:
      - Create a true/false question
      - Make it test understanding, not just memorization
      - Include a detailed explanation for the answer
      - Write in ${contentLanguage}`;

    // Call OpenAI API for theory content
    const theoryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: theoryPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!theoryResponse.ok) {
      throw new Error(`Theory generation failed: ${theoryResponse.statusText}`);
    }

    const theoryData = await theoryResponse.json();
    const theoryContent = theoryData.choices[0].message.content;
    const [slide1, slide2] = theoryContent.split('\n\n---\n\n');

    // Call OpenAI API for quiz content
    const quizResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: theoryPrompt },
          { role: 'assistant', content: theoryContent },
          { role: 'user', content: quizPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!quizResponse.ok) {
      throw new Error(`Quiz generation failed: ${quizResponse.statusText}`);
    }

    const quizData = await quizResponse.json();
    const quizContent = quizData.choices[0].message.content;

    // Extract quiz content
    const quiz1Match = quizContent.match(/Q1:[\s\S]*?Explanation:([\s\S]*?)(?=\n\nQ2:|$)/i);
    const quiz2Match = quizContent.match(/Q2:[\s\S]*?Explanation:([\s\S]*?)$/i);

    if (!quiz1Match || !quiz2Match) {
      throw new Error('Failed to parse quiz content');
    }

    // Process quiz 1 (multiple choice)
    const quiz1Full = quiz1Match[0];
    const quiz1Question = quiz1Full.match(/Q1:(.*?)(?=\nA\)|Options:)/s)?.[1]?.trim() || '';
    const quiz1Options = [...quiz1Full.matchAll(/[A-D]\)(.*?)(?=\n[A-D]\)|\nCorrect|$)/gs)]
      .map(match => match[1].trim());
    const quiz1Answer = quiz1Full.match(/Correct Answer:[^A-D]*([A-D])/)?.[1] || '';
    const quiz1Explanation = quiz1Match[1].trim();

    // Process quiz 2 (true/false)
    const quiz2Full = quiz2Match[0];
    const quiz2Question = quiz2Full.match(/Q2:(.*?)(?=\nTrue|False|Correct)/s)?.[1]?.trim() || '';
    const quiz2Answer = (quiz2Full.match(/Correct Answer:.*?(True|False)/i)?.[1].toLowerCase() === 'true');
    const quiz2Explanation = quiz2Match[1].trim();

    const content = {
      theory_slide_1: slide1,
      theory_slide_2: slide2,
      quiz_1_type: 'multiple_choice',
      quiz_1_question: quiz1Question,
      quiz_1_options: quiz1Options,
      quiz_1_correct_answer: quiz1Answer,
      quiz_1_explanation: quiz1Explanation,
      quiz_2_type: 'true_false',
      quiz_2_question: quiz2Question,
      quiz_2_correct_answer: quiz2Answer,
      quiz_2_explanation: quiz2Explanation
    };

    console.log('Generated content for segment:', content);

    return new Response(
      JSON.stringify({
        content
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-segment-content:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

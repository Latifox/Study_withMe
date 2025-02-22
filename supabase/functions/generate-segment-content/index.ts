
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent } = await req.json();
    console.log('Received request for segment content generation:', {
      lectureId,
      segmentNumber,
      segmentTitle,
      segmentDescription,
    });

    if (!lectureId || !segmentNumber || !segmentTitle || !segmentDescription || !lectureContent) {
      console.error('Missing required parameters:', { lectureId, segmentNumber, segmentTitle, segmentDescription });
      throw new Error('Missing required parameters');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate theories and quizzes using GPT-4
    const theoryPrompt1 = `Based on this lecture content: "${lectureContent}", create an engaging and informative theory slide about "${segmentTitle}". Focus specifically on this segment's description: "${segmentDescription}". Present the information in a clear, structured way using markdown format. Include relevant details and examples from the lecture content.`;
    
    const theoryPrompt2 = `Based on this lecture content: "${lectureContent}", create a second theory slide about "${segmentTitle}" that builds upon the first slide. Focus on: "${segmentDescription}". Present additional details, examples, and applications in markdown format. Make sure to complement the first slide without repeating the same information.`;

    const quizPrompt = `Based on this lecture content: "${lectureContent}" and focusing on the segment "${segmentTitle}" with description "${segmentDescription}", generate 2 quiz questions. Each question should test understanding of key concepts. Format as JSON with this structure:
    {
      "questions": [
        {
          "type": "multiple_choice",
          "question": "...",
          "options": ["...", "...", "...", "..."],
          "correctAnswer": "...",
          "explanation": "..."
        },
        {
          "type": "true_false",
          "question": "...",
          "correctAnswer": boolean,
          "explanation": "..."
        }
      ]
    }`;

    console.log('Generating theory slide 1...');
    const theory1Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a knowledgeable teacher creating educational content.' },
          { role: 'user', content: theoryPrompt1 }
        ],
      }),
    });

    const theory1Data = await theory1Response.json();
    const theory1Content = theory1Data.choices[0].message.content;
    console.log('Theory 1 generated');

    console.log('Generating theory slide 2...');
    const theory2Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a knowledgeable teacher creating educational content.' },
          { role: 'user', content: theoryPrompt2 }
        ],
      }),
    });

    const theory2Data = await theory2Response.json();
    const theory2Content = theory2Data.choices[0].message.content;
    console.log('Theory 2 generated');

    console.log('Generating quizzes...');
    const quizResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a knowledgeable teacher creating educational quiz content.' },
          { role: 'user', content: quizPrompt }
        ],
      }),
    });

    const quizData = await quizResponse.json();
    const quizContent = JSON.parse(quizData.choices[0].message.content);
    console.log('Quizzes generated');

    // Prepare the content object
    const segmentContent = {
      lecture_id: lectureId,
      sequence_number: segmentNumber,
      title: segmentTitle,
      segment_description: segmentDescription,
      slides: [
        { content: theory1Content },
        { content: theory2Content }
      ],
      questions: quizContent.questions
    };

    console.log('Saving segment content to database...');
    const { error: insertError } = await supabase
      .from('segments_content')
      .insert(segmentContent);

    if (insertError) {
      console.error('Error inserting segment content:', insertError);
      throw insertError;
    }

    console.log('Segment content saved successfully');
    return new Response(
      JSON.stringify({ success: true, message: 'Segment content generated and saved successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-segment-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

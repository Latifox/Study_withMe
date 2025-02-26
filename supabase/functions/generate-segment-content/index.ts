
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentRequest {
  lectureId: number;
  segmentNumber: number;
  segmentTitle: string;
  segmentDescription: string;
  lectureContent: string;
  contentLanguage: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
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
      contentLanguage,
    } = await req.json() as ContentRequest;

    console.log(`Generating content for segment ${segmentNumber}: ${segmentTitle}`);

    // Create content generation prompt
    const prompt = `Generate educational content for a lecture segment with the following details:
Title: ${segmentTitle}
Description: ${segmentDescription}

Use this section of the lecture content as reference:
${lectureContent}

Create content in ${contentLanguage} language.

Return a JSON object with EXACTLY these fields:
{
  "theory_slide_1": "First slide content explaining core concepts",
  "theory_slide_2": "Second slide with practical examples or deeper insights",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "A question testing understanding",
  "quiz_1_options": ["Option A", "Option B", "Option C", "Option D"],
  "quiz_1_correct_answer": "The correct option (exact match with one of the options)",
  "quiz_1_explanation": "Explanation of why this answer is correct",
  "quiz_2_type": "true_false",
  "quiz_2_question": "A true/false question about the content",
  "quiz_2_correct_answer": true or false,
  "quiz_2_explanation": "Explanation of why this is true or false"
}

IMPORTANT:
1. Return ONLY the JSON object, no other text
2. Ensure all field names match exactly
3. quiz_1_correct_answer must be one of the options in quiz_1_options
4. quiz_2_correct_answer must be a boolean
5. Do not use markdown code blocks in any text field
6. Keep theory slides concise but informative`;

    // Make request to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an educational content generator. Provide responses only in valid JSON format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    let content;
    try {
      content = JSON.parse(data.choices[0].message.content.trim());
      console.log('Successfully parsed OpenAI response');
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      throw new Error('Failed to parse content from OpenAI');
    }

    // Validate the content structure
    const requiredFields = [
      'theory_slide_1',
      'theory_slide_2',
      'quiz_1_type',
      'quiz_1_question',
      'quiz_1_options',
      'quiz_1_correct_answer',
      'quiz_1_explanation',
      'quiz_2_type',
      'quiz_2_question',
      'quiz_2_correct_answer',
      'quiz_2_explanation'
    ];

    for (const field of requiredFields) {
      if (!content[field]) {
        console.error(`Missing required field: ${field}`);
        throw new Error(`Generated content missing required field: ${field}`);
      }
    }

    // Validate quiz_1_correct_answer is in options
    if (!content.quiz_1_options.includes(content.quiz_1_correct_answer)) {
      console.error('quiz_1_correct_answer not found in options');
      throw new Error('Generated content invalid: correct answer not in options');
    }

    // Validate quiz_2_correct_answer is boolean
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
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

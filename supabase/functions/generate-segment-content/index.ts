
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent } = await req.json();

    console.log(`Generating content for segment ${segmentNumber} of lecture ${lectureId}`);
    console.log('Title:', segmentTitle);
    console.log('Description:', segmentDescription);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    // Call OpenAI to generate segment content
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an educational content generator. Generate content that matches exactly this JSON structure for a segment:
{
  "theory_slide_1": "string",
  "theory_slide_2": "string",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "string",
  "quiz_1_options": ["string", "string", "string", "string"],
  "quiz_1_correct_answer": "string (must be one of the options)",
  "quiz_1_explanation": "string",
  "quiz_2_type": "true_false",
  "quiz_2_question": "string",
  "quiz_2_correct_answer": boolean,
  "quiz_2_explanation": "string"
}`
          },
          {
            role: 'user',
            content: `Generate educational content for this segment:
Title: ${segmentTitle}
Description: ${segmentDescription}
Context from lecture: ${lectureContent.substring(0, 2000)}

Requirements:
1. Theory slides should teach concepts progressively
2. Quiz 1 must be multiple choice with exactly 4 options
3. Quiz 2 must be true/false
4. Use markdown for formatting
5. Keep explanations clear and concise
6. Format as a strict JSON object matching the structure provided

Remember: Your output must be a valid JSON object that can be parsed and exactly matches the structure provided.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const contentString = data.choices[0].message.content;
    
    // Extract the JSON object from the response
    let content;
    try {
      // Find the JSON object in the response (it might be wrapped in backticks or markdown)
      const jsonMatch = contentString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      content = JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('JSON parsing error:', error);
      throw new Error(`Failed to parse generated content: ${error.message}`);
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
      if (!(field in content)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate quiz_1_options is an array with exactly 4 options
    if (!Array.isArray(content.quiz_1_options) || content.quiz_1_options.length !== 4) {
      throw new Error('quiz_1_options must be an array with exactly 4 options');
    }

    // Validate quiz_1_correct_answer is one of the options
    if (!content.quiz_1_options.includes(content.quiz_1_correct_answer)) {
      throw new Error('quiz_1_correct_answer must be one of the quiz_1_options');
    }

    // Validate quiz types
    if (content.quiz_1_type !== 'multiple_choice') {
      throw new Error('quiz_1_type must be "multiple_choice"');
    }
    if (content.quiz_2_type !== 'true_false') {
      throw new Error('quiz_2_type must be "true_false"');
    }

    // Validate quiz_2_correct_answer is boolean
    if (typeof content.quiz_2_correct_answer !== 'boolean') {
      throw new Error('quiz_2_correct_answer must be a boolean');
    }

    // Store the content in the database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: dbError } = await supabaseClient
      .from('segments_content')
      .upsert({
        lecture_id: lectureId,
        sequence_number: segmentNumber,
        ...content
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to save content to database: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Content generated and saved successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred while generating content'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

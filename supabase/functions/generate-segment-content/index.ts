
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

  try {
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent } = await req.json();

    if (!lectureId || !segmentNumber || !segmentTitle || !segmentDescription || !lectureContent) {
      throw new Error('Missing required parameters');
    }

    console.log(`Processing segment ${segmentNumber} for lecture ${lectureId}`);
    console.log(`Title: ${segmentTitle}`);
    console.log(`Description: ${segmentDescription}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Fetch AI configuration and lecture language
    const { data: aiConfig, error: configError } = await supabaseClient
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .single();

    if (configError) {
      console.error('Error fetching AI config:', configError);
    }

    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('original_language')
      .eq('id', lectureId)
      .single();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
    }

    // Determine content language
    const targetLanguage = aiConfig?.content_language || lecture?.original_language || 'English';
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const temperature = aiConfig?.temperature || 0.7;
    const creativityLevel = aiConfig?.creativity_level || 0.5;
    const detailLevel = aiConfig?.detail_level || 0.6;
    const customInstructions = aiConfig?.custom_instructions || '';

    // Prepare system message based on AI configuration
    const systemMessage = `You are an expert educational content creator tasked with generating engaging learning materials.
Configuration:
- Target Language: ${targetLanguage}
- Creativity Level: ${creativityLevel} (higher means more creative and engaging content)
- Detail Level: ${detailLevel} (higher means more detailed explanations)
${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

Guidelines:
1. Generate content in ${targetLanguage}
2. Each theory slide should be comprehensive but concise
3. Quiz 1 must be multiple choice
4. Quiz 2 must be true/false
5. Use markdown for formatting
6. Return only a valid JSON object matching the structure provided, no additional text or markdown formatting
7. Maintain academic rigor while being engaging
8. Scale detail level according to configuration (${detailLevel})
9. Adjust creativity in examples and explanations (${creativityLevel})`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          {
            role: 'user',
            content: `Generate learning content for the following segment:

Title: ${segmentTitle}
Description: ${segmentDescription}

Context from lecture: ${lectureContent}

Generate content in this exact JSON structure:
{
  "theory_slide_1": "First theory slide content with key concepts",
  "theory_slide_2": "Second theory slide content with examples and applications",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "The question text",
  "quiz_1_options": ["Option A", "Option B", "Option C", "Option D"],
  "quiz_1_correct_answer": "The correct option",
  "quiz_1_explanation": "Explanation of the correct answer",
  "quiz_2_type": "true_false",
  "quiz_2_question": "A true/false question",
  "quiz_2_correct_answer": true or false,
  "quiz_2_explanation": "Explanation of why the answer is true or false"
}`
          }
        ],
        temperature: temperature
      })
    });

    const data = await response.json();
    console.log('OpenAI response received');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI');
    }

    const content = data.choices[0].message.content;
    console.log('Processing content:', content.substring(0, 200) + '...');

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      throw new Error('Failed to parse AI-generated content');
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
      if (!parsedContent[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(parsedContent.quiz_1_options)) {
      throw new Error('quiz_1_options must be an array');
    }

    if (typeof parsedContent.quiz_2_correct_answer !== 'boolean') {
      throw new Error('quiz_2_correct_answer must be a boolean');
    }

    // Store the content in the database
    const { error: dbError } = await supabaseClient
      .from('segments_content')
      .upsert({
        lecture_id: lectureId,
        sequence_number: segmentNumber,
        ...parsedContent
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Content generated for segment ${segmentNumber}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

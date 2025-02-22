
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from './cors.ts';
import { generateContent } from './generator.ts';
import { Validator } from './validator.ts';
import { DBClient } from './db.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent } = await req.json();
    console.log('Received request for lecture:', lectureId, 'segment:', segmentNumber);
    console.log('Segment description:', segmentDescription);
    console.log('Content length:', lectureContent?.length || 0);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const db = new DBClient(supabaseClient);
    const validator = new Validator();

    const prompt = `
      You are an expert content generator focused on creating educational material. Your task is to generate content based on this detailed segment description:

      SEGMENT TITLE: "${segmentTitle}"

      DETAILED DESCRIPTION:
      ${segmentDescription}

      SOURCE MATERIAL:
      """
      ${lectureContent}
      """

      CRITICAL REQUIREMENTS:
      1. Use ONLY information from the provided source material that is relevant to the segment description
      2. First theory slide (150 words max) should provide a clear, focused introduction based on the description
      3. Second theory slide (300-400 words) should expand on these concepts in detail
      4. DO NOT repeat information between slides
      5. Ensure each slide builds on the previous one
      6. Focus ONLY on the specific aspects mentioned in the segment description
      7. Include practical examples or applications where relevant

      OUTPUT FORMAT:
      Return content in this exact JSON structure:
      {
        "theory_slide_1": "Brief introduction and key concepts (MAX 150 words)",
        "theory_slide_2": "Detailed explanation with examples (300-400 words)",
        "quiz_1_type": "multiple_choice",
        "quiz_1_question": "Conceptual understanding question",
        "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "quiz_1_correct_answer": "Exact match to one of the options",
        "quiz_1_explanation": "Clear explanation of the correct answer",
        "quiz_2_type": "true_false",
        "quiz_2_question": "Application-based statement",
        "quiz_2_correct_answer": boolean,
        "quiz_2_explanation": "Detailed explanation with reference to content"
      }
    `;

    console.log('Generating content...');
    const content = await generateContent(prompt);
    const validatedContent = validator.validateContent(content);

    await db.insertContent(lectureId, segmentNumber, validatedContent);
    console.log('Content generated and stored successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

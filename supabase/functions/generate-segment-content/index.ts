
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import OpenAI from "https://deno.land/x/openai@v4.20.1/mod.ts";

const openAI = new OpenAI(Deno.env.get('OPENAI_API_KEY') || '');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent, contentLanguage = 'english' } = await req.json();

    if (!lectureId || !segmentNumber || !segmentTitle || !segmentDescription || !lectureContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating content for:', { 
      lectureId, 
      segmentNumber, 
      segmentTitle,
      contentLanguage 
    });

    const systemPrompt = `You are an educational content generator that creates engaging learning materials. Your task is to generate two theory slides and two quiz questions based on the provided lecture segment. The content should be in ${contentLanguage}.

Output a JSON object with the following structure:
{
  "theory_slide_1": "First theory slide content",
  "theory_slide_2": "Second theory slide content",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "Question text",
  "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "quiz_1_correct_answer": "The correct option",
  "quiz_1_explanation": "Explanation of the correct answer",
  "quiz_2_type": "true_false",
  "quiz_2_question": "True/False question text",
  "quiz_2_correct_answer": true or false,
  "quiz_2_explanation": "Explanation of why true or false"
}

IMPORTANT:
1. Return ONLY valid JSON, no markdown or other formatting.
2. Make sure theory slides are clear and concise.
3. Multiple choice questions must have exactly 4 options.
4. Ensure all content is relevant to the segment title and description.`;

    console.log('System prompt prepared, sending request to OpenAI...');
    
    const completion = await openAI.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: systemPrompt
        },
        {
          role: "user",
          content: `Generate content for this segment:
Title: ${segmentTitle}
Description: ${segmentDescription}
Relevant lecture content: ${lectureContent}`
        }
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content;
    console.log('OpenAI response received:', responseText);

    // Parse the response as JSON directly, it should be clean JSON now
    const content = JSON.parse(responseText);

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-segment-content function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error generating content',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

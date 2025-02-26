
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { OpenAI } from "https://deno.land/x/openai@1.4.3/mod.ts"
import { corsHeaders } from '../_shared/cors.ts'

const openAI = new OpenAI(Deno.env.get('OPENAI_API_KEY') || '');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent, contentLanguage } = await req.json()

    console.log(`Generating content for segment ${segmentNumber} of lecture ${lectureId}`);
    console.log('Content language:', contentLanguage);

    // Validate required fields
    if (!lectureId || !segmentNumber || !segmentTitle || !segmentDescription || !lectureContent) {
      throw new Error('Missing required fields');
    }

    const prompt = `
      Generate educational content for a lecture segment with the following details:
      Title: ${segmentTitle}
      Description: ${segmentDescription}
      Content Language: ${contentLanguage || 'english'}

      Create content in this format:
      1. Two theory slides that explain the key concepts from the lecture content, focusing on this segment's topic
      2. Two quiz questions to test understanding

      The content should be based on this lecture material:
      ${lectureContent}

      Return a JSON object with these exact fields:
      {
        "theory_slide_1": "First slide content with main concept explanation",
        "theory_slide_2": "Second slide content with detailed examples",
        "quiz_1_type": "multiple_choice",
        "quiz_1_question": "Question text",
        "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "quiz_1_correct_answer": "Correct option",
        "quiz_1_explanation": "Why this is correct",
        "quiz_2_type": "true_false",
        "quiz_2_question": "True/false question text",
        "quiz_2_correct_answer": true/false,
        "quiz_2_explanation": "Why this is true/false"
      }
    `;

    console.log('Sending request to OpenAI...');
    
    const completion = await openAI.createChatCompletion({
      model: "gpt-4o-mini", // Changed from gpt-4 to gpt-4o-mini
      messages: [
        { 
          "role": "system", 
          "content": "You are an educational content creator specializing in creating engaging and informative lecture materials."
        },
        { 
          "role": "user", 
          "content": prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const response = completion.choices[0].message.content;
    console.log('Received response from OpenAI');

    let content;
    try {
      content = JSON.parse(response);
      console.log('Successfully parsed OpenAI response');
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      throw new Error('Invalid content format received from OpenAI');
    }

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )
  }
})

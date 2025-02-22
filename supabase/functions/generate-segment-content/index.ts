
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAiKey = Deno.env.get('OPENAI_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!openAiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!)
    const { lectureId, segmentNumber, lectureContent, segmentTitle, segmentDescription } = await req.json()

    if (!lectureId || !segmentNumber || !lectureContent || !segmentTitle || !segmentDescription) {
      throw new Error('Missing required parameters')
    }

    console.log('Generating content for:', { lectureId, segmentNumber, segmentTitle })

    // Generate theory slides
    const slidesResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an educational content creator specializing in creating engaging and informative theory slides."
          },
          {
            role: "user",
            content: `Create 2 theory slides for this segment of a lecture. The content should be clear, concise, and engaging.
            
            Segment Title: ${segmentTitle}
            Segment Description: ${segmentDescription}
            
            Format as a JSON object with this structure:
            {
              "slide1": "content for first slide",
              "slide2": "content for second slide"
            }
            
            Here's the relevant lecture content:
            ${lectureContent.substring(0, 8000)}`
          }
        ],
        temperature: 0.7
      })
    })

    if (!slidesResponse.ok) {
      throw new Error('Failed to generate theory slides')
    }

    const slidesResult = await slidesResponse.json()
    const slides = JSON.parse(slidesResult.choices[0].message.content)

    // Generate quiz questions
    const quizResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an educational assessment expert specializing in creating engaging quiz questions."
          },
          {
            role: "user",
            content: `Create 2 quiz questions for this segment of a lecture. Question 1 should be multiple choice, Question 2 should be true/false.

            Segment Title: ${segmentTitle}
            Segment Description: ${segmentDescription}
            
            Format as a JSON object with this structure:
            {
              "quiz1": {
                "type": "multiple_choice",
                "question": "question text",
                "options": ["option1", "option2", "option3", "option4"],
                "correctAnswer": "correct option text",
                "explanation": "explanation of the correct answer"
              },
              "quiz2": {
                "type": "true_false",
                "question": "question text",
                "correctAnswer": true or false,
                "explanation": "explanation of the correct answer"
              }
            }
            
            Here's the relevant lecture content:
            ${lectureContent.substring(0, 8000)}`
          }
        ],
        temperature: 0.7
      })
    })

    if (!quizResponse.ok) {
      throw new Error('Failed to generate quiz questions')
    }

    const quizResult = await quizResponse.json()
    const quizzes = JSON.parse(quizResult.choices[0].message.content)

    // Save to database
    const { error: insertError } = await supabase
      .from('segments_content')
      .upsert({
        lecture_id: lectureId,
        sequence_number: segmentNumber,
        theory_slide_1: slides.slide1,
        theory_slide_2: slides.slide2,
        quiz_1_type: quizzes.quiz1.type,
        quiz_1_question: quizzes.quiz1.question,
        quiz_1_options: quizzes.quiz1.options,
        quiz_1_correct_answer: quizzes.quiz1.correctAnswer,
        quiz_1_explanation: quizzes.quiz1.explanation,
        quiz_2_type: quizzes.quiz2.type,
        quiz_2_question: quizzes.quiz2.question,
        quiz_2_correct_answer: quizzes.quiz2.correctAnswer,
        quiz_2_explanation: quizzes.quiz2.explanation
      })

    if (insertError) {
      console.error('Database insertion error:', insertError)
      throw new Error('Failed to save segment content to database')
    }

    console.log('Successfully generated and stored segment content')

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in generate-segment-content:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

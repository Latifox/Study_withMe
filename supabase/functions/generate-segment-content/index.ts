
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const {
      lectureId,
      segmentNumber,
      segmentTitle,
      segmentDescription,
      lectureContent
    } = await req.json()

    if (!lectureId || !segmentNumber || !segmentTitle || !lectureContent) {
      throw new Error('Missing required parameters')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    console.log('Fetching AI config for lecture:', lectureId)
    
    // Fetch AI configuration
    const { data: aiConfig, error: configError } = await supabase
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .maybeSingle()

    if (configError) {
      console.error('Error fetching AI config:', configError)
    }

    // Use default values if no config is found
    const config = aiConfig || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      content_language: 'English',
      custom_instructions: ''
    }

    console.log('Using AI config:', config)

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    
    // Enhanced system prompt with specific formatting instructions
    const systemPrompt = `You are an expert educational content creator. Create engaging, well-structured content following these strict formatting requirements:

1. Length and Structure:
   - Each slide must be between 150-350 words
   - Break content into clear sections using ## headers
   - Use proper paragraph breaks for readability

2. Formatting (use Markdown syntax):
   - Use **bold text** for key concepts and important terms
   - Create organized lists using * or - for bullet points
   - Use 1. 2. 3. for numbered lists
   - Use > for important quotes or key takeaways

3. Content Guidelines:
   - Explain concepts clearly and directly
   - Don't cite external sources or references
   - Make content engaging and educational
   - Use ${config.content_language || 'English'}
   - Be ${config.creativity_level > 0.5 ? 'creative and engaging' : 'focused and analytical'}
   - Provide ${config.detail_level > 0.5 ? 'detailed' : 'concise'} explanations

${config.custom_instructions ? `Additional instructions: ${config.custom_instructions}` : ''}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: config.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Create educational content for this lecture segment:
              Title: ${segmentTitle}
              Description: ${segmentDescription}
              
              Content to based on:
              ${lectureContent.substring(0, 8000)}
              
              Generate:
              1. Two theory slides (formatted according to the guidelines)
              2. Two quiz questions:
                 - First: A multiple choice question
                 - Second: A true/false question
              
              Format as valid JSON with these fields:
              {
                "theory_slide_1": "content",
                "theory_slide_2": "content",
                "quiz_1_type": "multiple_choice",
                "quiz_1_question": "question",
                "quiz_1_options": ["option1", "option2", "option3", "option4"],
                "quiz_1_correct_answer": "correct option",
                "quiz_1_explanation": "explanation",
                "quiz_2_type": "true_false",
                "quiz_2_question": "question",
                "quiz_2_correct_answer": true/false,
                "quiz_2_explanation": "explanation"
              }`
          }
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const aiResponse = await response.json()
    let content
    try {
      const jsonStr = aiResponse.choices[0].message.content.replace(/```json\n?|\n?```/g, '')
      content = JSON.parse(jsonStr)
    } catch (error) {
      console.error('Error parsing AI response:', error)
      throw new Error('Failed to parse AI response')
    }

    console.log('Generated content structure:', Object.keys(content))

    // Save the content to the database
    const { error: insertError } = await supabase
      .from('segments_content')
      .upsert({
        lecture_id: lectureId,
        sequence_number: segmentNumber,
        ...content
      })

    if (insertError) {
      console.error('Error saving content:', insertError)
      throw insertError
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in generate-segment-content:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})


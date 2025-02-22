
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lecture_id } = await req.json()
    
    if (!lecture_id) {
      throw new Error('lecture_id is required')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get lecture content
    console.log('Fetching lecture content for lecture:', lecture_id)
    const { data: lectureData, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content, title')
      .eq('id', lecture_id)
      .single()

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError)
      throw lectureError
    }

    if (!lectureData.content) {
      throw new Error('No content found for lecture')
    }

    const MAX_TOKENS = 500
    const MIN_SEGMENTS = 5
    const MAX_SEGMENTS = 8

    const promptContent = `
    Analyze the following lecture content and generate between ${MIN_SEGMENTS} and ${MAX_SEGMENTS} sequential learning segments.
    Each segment should have:
    - A title (max 5 words)
    - A description listing ONLY key concepts and their aspects (e.g., "Key concepts: coal (types, properties), energy (conversion, efficiency)")

    CRITICAL:
    1. Descriptions should ONLY list concepts and aspects, not actual content
    2. Format: "Key concepts: concept1 (aspect1, aspect2), concept2 (aspect1, aspect2)"
    3. Each segment should build on previous knowledge
    4. Avoid duplicate concepts across segments
    5. Focus on MAJOR concepts only

    LECTURE CONTENT:
    ${lectureData.content.substring(0, 8000)}

    OUTPUT FORMAT:
    Return a JSON array with each segment containing 'sequence_number', 'title', and 'segment_description'.
    Example:
    [
      {
        "sequence_number": 1,
        "title": "Introduction to Coal Properties",
        "segment_description": "Key concepts: coal (types, composition), mineral content (classification, distribution)"
      },
      ...
    ]`

    console.log('Sending request to OpenAI...')
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional educational content structuring assistant. Always return valid JSON arrays containing between 5 and 8 segments."
          },
          {
            role: "user",
            content: promptContent
          }
        ],
        temperature: 0.7,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" }
      }),
    })

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${openAIResponse.status}`)
    }

    const completion = await openAIResponse.json()
    const segments = JSON.parse(completion.choices[0].message.content)

    console.log('Generated segments:', segments)

    // Delete existing segments for this lecture
    const { error: deleteError } = await supabaseClient
      .from('lecture_segments')
      .delete()
      .eq('lecture_id', lecture_id)

    if (deleteError) {
      console.error('Error deleting existing segments:', deleteError)
      throw deleteError
    }

    // Insert new segments
    const { error: insertError } = await supabaseClient
      .from('lecture_segments')
      .insert(
        segments.map((segment: any) => ({
          lecture_id,
          sequence_number: segment.sequence_number,
          title: segment.title,
          segment_description: segment.segment_description
        }))
      )

    if (insertError) {
      console.error('Error inserting segments:', insertError)
      throw insertError
    }

    return new Response(JSON.stringify({
      success: true,
      segments: segments
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})


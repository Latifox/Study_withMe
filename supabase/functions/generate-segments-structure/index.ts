
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!openAiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!)
    const { lectureId, lectureContent } = await req.json()

    if (!lectureId || !lectureContent) {
      throw new Error('Missing required parameters: lectureId or lectureContent')
    }

    console.log('Generating structure for lecture:', lectureId)
    console.log('Content length:', lectureContent.length)

    // Call OpenAI to generate the segments
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: "You are an educational content structuring assistant. Your task is to analyze lecture content and break it down into logical segments. Each segment should have a clear title and a detailed narrative description explaining what will be covered."
          },
          {
            role: "user",
            content: `Please analyze this lecture content and break it into 4-6 learning segments. Each segment should have:
            1. A title that clearly indicates the main topic
            2. A sequence number (starting from 1)
            3. A detailed description (1-2 paragraphs) explaining what concepts and ideas will be covered
            
            Format your response as a JSON object with this exact structure:
            {
              "segments": [
                {
                  "title": "segment title",
                  "sequence_number": number,
                  "segment_description": "detailed description"
                }
              ]
            }
            
            Here's the content to analyze:
            ${lectureContent.substring(0, 15000)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI API error: ${error}`)
    }

    const result = await response.json()
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      console.error('Unexpected OpenAI response format:', result)
      throw new Error('Invalid response format from OpenAI')
    }

    const content = result.choices[0].message.content
    console.log('OpenAI response:', content)

    let segments
    try {
      segments = JSON.parse(content)
      // Validate the structure
      if (!segments.segments || !Array.isArray(segments.segments)) {
        throw new Error('Invalid segments structure')
      }
    } catch (error) {
      console.error('Error parsing OpenAI response:', error)
      throw new Error('Failed to parse segments structure from OpenAI response')
    }

    // Insert segments into database
    for (const segment of segments.segments) {
      const { error: insertError } = await supabase
        .from('lecture_segments')
        .insert({
          lecture_id: lectureId,
          title: segment.title,
          sequence_number: segment.sequence_number,
          segment_description: segment.segment_description
        })

      if (insertError) {
        console.error('Error inserting segment:', insertError)
        throw new Error(`Failed to insert segment: ${insertError.message}`)
      }
    }

    console.log('Successfully generated and stored segments structure')

    return new Response(JSON.stringify({ segments: segments.segments }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error in generate-segments-structure:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

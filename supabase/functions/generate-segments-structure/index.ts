
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
    console.log('Starting generate-segments-structure function')

    if (!openAiKey) {
      console.error('OpenAI API key not configured')
      throw new Error('OpenAI API key not configured')
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!)
    const { lectureId, lectureContent } = await req.json()

    if (!lectureId || !lectureContent) {
      console.error('Missing required parameters:', { lectureId, hasContent: !!lectureContent })
      throw new Error('Missing required parameters: lectureId or lectureContent')
    }

    console.log('Processing lecture:', lectureId)
    console.log('Content length:', lectureContent.length)

    // Call OpenAI to generate the segments
    console.log('Calling OpenAI API...')
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
            content: "You are an educational content structuring assistant. Your task is to analyze lecture content and break it down into logical segments. Each segment should have a title, sequence number, and description. You must return your response in valid JSON format with no markdown."
          },
          {
            role: "user",
            content: `Please analyze this lecture content and break it into 4-6 learning segments. Return ONLY a JSON object with this structure (no markdown or text):
            {
              "segments": [
                {
                  "title": "segment title",
                  "sequence_number": number,
                  "segment_description": "detailed description"
                }
              ]
            }

            Use this lecture content:
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
    if (!result.choices?.[0]?.message?.content) {
      console.error('Unexpected OpenAI response format:', result)
      throw new Error('Invalid response format from OpenAI')
    }

    console.log('Received OpenAI response, parsing JSON...')
    const content = result.choices[0].message.content
    
    let segments
    try {
      segments = JSON.parse(content.trim())
      if (!segments.segments || !Array.isArray(segments.segments)) {
        console.error('Invalid segments structure:', segments)
        throw new Error('Invalid segments structure')
      }
    } catch (error) {
      console.error('Error parsing OpenAI response:', error, '\nContent:', content)
      throw new Error('Failed to parse segments structure from OpenAI response')
    }

    console.log('Successfully parsed segments:', segments)

    // Insert segments into database
    for (const segment of segments.segments) {
      console.log('Inserting segment:', segment)
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
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

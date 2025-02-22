
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
    const { lectureId, lectureContent, lectureTitle } = await req.json()

    if (!lectureId || !lectureContent) {
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase client
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
    
    // Build the system prompt incorporating AI config
    let systemPrompt = `You are an expert educational content organizer. Create a structured outline for a lecture titled "${lectureTitle}" 
    in ${config.content_language || 'English'}. Break down the content into 3-5 logical segments. 
    Be ${config.creativity_level > 0.5 ? 'creative and engaging' : 'focused and analytical'} in your approach. 
    Provide ${config.detail_level > 0.5 ? 'detailed' : 'concise'} segment descriptions.
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
            content: `Based on this lecture content, create a logical segment structure:
            ${lectureContent.substring(0, 8000)}` // Limit content length
          }
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const aiResponse = await response.json()
    const segmentText = aiResponse.choices[0].message.content

    // Parse the segments from the AI response
    const segments = []
    let currentSegment = null
    const lines = segmentText.split('\n')

    for (const line of lines) {
      const segmentMatch = line.match(/^Segment (\d+):\s*(.+)/)
      const descriptionMatch = line.match(/^Description:\s*(.+)/)

      if (segmentMatch) {
        if (currentSegment) segments.push(currentSegment)
        currentSegment = {
          sequence_number: parseInt(segmentMatch[1]),
          title: segmentMatch[2].trim(),
          segment_description: ''
        }
      } else if (descriptionMatch && currentSegment) {
        currentSegment.segment_description = descriptionMatch[1].trim()
      }
    }
    if (currentSegment) segments.push(currentSegment)

    // Save segments to database
    console.log('Saving segments:', segments)
    for (const segment of segments) {
      const { error: insertError } = await supabase
        .from('lecture_segments')
        .insert({
          lecture_id: lectureId,
          sequence_number: segment.sequence_number,
          title: segment.title,
          segment_description: segment.segment_description
        })

      if (insertError) {
        console.error('Error inserting segment:', insertError)
        throw insertError
      }
    }

    return new Response(JSON.stringify({ segments }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in generate-segments-structure:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

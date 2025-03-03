
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    console.log('Generate segments structure function called')
    const requestData = await req.json()
    const { lectureId, lectureContent, lectureTitle, isProfessorLecture = false } = requestData
    
    // Validate lectureId
    if (!lectureId) {
      console.error('Missing required field: lectureId')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: lectureId' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 400 }
      )
    }

    console.log(`Processing lecture ID: ${lectureId}, isProfessorLecture: ${isProfessorLecture}`)
    
    // Initialize Supabase client with admin privileges
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      )
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // If lectureContent is not provided, fetch it from the database
    let content = lectureContent
    let title = lectureTitle
    
    if (!content || !title) {
      console.log('Lecture content or title not provided in request, fetching from database...')
      const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
      
      const { data: lectureData, error: fetchError } = await supabaseAdmin
        .from(tableName)
        .select('title, content')
        .eq('id', lectureId)
        .single()
      
      if (fetchError) {
        console.error(`Error fetching lecture data from ${tableName}:`, fetchError)
        return new Response(
          JSON.stringify({ success: false, error: `Failed to fetch lecture data: ${fetchError.message}` }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
        )
      }
      
      if (!lectureData) {
        console.error(`No lecture found with ID ${lectureId} in ${tableName}`)
        return new Response(
          JSON.stringify({ success: false, error: `No lecture found with ID ${lectureId}` }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 404 }
        )
      }
      
      content = lectureData.content
      title = lectureData.title || 'Untitled Lecture'
      
      console.log(`Fetched lecture title: ${title}`)
      console.log(`Fetched content length: ${content ? content.length : 0} characters`)
    }
    
    // Validate content
    if (!content) {
      console.error('Lecture content is missing or empty')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: lectureContent' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 400 }
      )
    }
    
    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })
    const openai = new OpenAIApi(configuration)
    
    console.log('Generating segments structure with OpenAI...')
    
    // Prepare the content for OpenAI
    let trimmedContent = content
    if (content.length > 15000) {
      trimmedContent = content.substring(0, 15000)
      console.log(`Content trimmed from ${content.length} to 15000 characters for OpenAI API request`)
    }
    
    // Craft the OpenAI prompt for generating segments
    const segmentsPrompt = `
    You are an AI assistant that helps structure educational content into logical segments for students.

    Title of lecture: "${title}"
    
    Lecture content (partial):
    ${trimmedContent}
    
    Based on the lecture title and content provided, please create 3-5 logical segments for this lecture. 
    Each segment should have a clear title and a brief description explaining what the segment covers.
    
    Format your response as valid JSON with this structure:
    {
      "segments": [
        {
          "sequence_number": 1,
          "title": "Segment Title",
          "segment_description": "Brief description of what this segment covers"
        },
        ...
      ]
    }
    
    Do not include any other text outside of the JSON object.
    `
    
    try {
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: segmentsPrompt }],
        temperature: 0.7,
        max_tokens: 1000,
      })
      
      const response = completion.data.choices[0].message?.content?.trim()
      
      if (!response) {
        console.error('OpenAI returned empty response')
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to generate segments: Empty response from AI' }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
        )
      }
      
      console.log('OpenAI response:', response)
      
      // Parse the JSON response
      let parsedResponse
      try {
        // Find JSON object in the response (in case it has markdown backticks or other text)
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0])
        } else {
          parsedResponse = JSON.parse(response)
        }
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError)
        console.error('Raw response:', response)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
        )
      }
      
      if (!parsedResponse.segments || !Array.isArray(parsedResponse.segments) || parsedResponse.segments.length === 0) {
        console.error('Invalid segments format in OpenAI response')
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid segments format in AI response' }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
        )
      }
      
      console.log(`Generated ${parsedResponse.segments.length} segments`)
      
      // Delete existing segments before creating new ones
      const segmentsTable = isProfessorLecture ? 'professor_lecture_segments' : 'lecture_segments'
      console.log(`Deleting existing segments from ${segmentsTable}...`)
      
      const { error: deleteError } = await supabaseAdmin
        .from(segmentsTable)
        .delete()
        .eq('lecture_id', lectureId)
      
      if (deleteError) {
        console.error(`Error deleting existing segments from ${segmentsTable}:`, deleteError)
        return new Response(
          JSON.stringify({ success: false, error: `Failed to delete existing segments: ${deleteError.message}` }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
        )
      }
      
      // Insert new segments
      console.log(`Inserting new segments into ${segmentsTable}...`)
      const segmentsToInsert = parsedResponse.segments.map((segment: any) => ({
        lecture_id: lectureId,
        sequence_number: segment.sequence_number,
        title: segment.title,
        segment_description: segment.segment_description,
      }))
      
      const { error: insertError } = await supabaseAdmin
        .from(segmentsTable)
        .insert(segmentsToInsert)
      
      if (insertError) {
        console.error(`Error inserting segments into ${segmentsTable}:`, insertError)
        return new Response(
          JSON.stringify({ success: false, error: `Failed to insert segments: ${insertError.message}` }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
        )
      }
      
      console.log('Segments structure created successfully')
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Segments structure created successfully',
          segments: parsedResponse.segments
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError)
      return new Response(
        JSON.stringify({ success: false, error: `OpenAI API error: ${openaiError.message}` }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      )
    }
  } catch (error) {
    console.error('Unhandled error in generate-segments-structure function:', error)
    return new Response(
      JSON.stringify({ success: false, error: `Server error: ${error.message}` }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
    )
  }
})

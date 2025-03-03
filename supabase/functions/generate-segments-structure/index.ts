
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1'
import { corsHeaders } from '../_shared/cors.ts'

export const handler = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request for CORS preflight')
    return new Response(null, {
      headers: corsHeaders,
    })
  }

  try {
    console.log('Starting segment structure generation')
    const { lectureId, lectureTitle, lectureContent, isProfessorLecture = false } = await req.json()
    
    if (!lectureId) {
      const errorMsg = 'Missing required field: lectureId'
      console.error(errorMsg)
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`Processing segments for: lectureId=${lectureId}, isProfessorLecture=${isProfessorLecture}`)
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Determine which tables to use based on isProfessorLecture
    const lectureTable = isProfessorLecture ? 'professor_lectures' : 'lectures'
    const segmentsTable = isProfessorLecture ? 'professor_lecture_segments' : 'lecture_segments'
    
    let content = lectureContent
    let title = lectureTitle
    
    // If lectureContent is not provided, fetch it from the database
    if (!content) {
      console.log(`No lecture content provided, fetching from ${lectureTable} table for lecture ID ${lectureId}`)
      
      const { data: lectureData, error: lectureError } = await supabase
        .from(lectureTable)
        .select('content, title')
        .eq('id', lectureId)
        .single()
      
      if (lectureError || !lectureData?.content) {
        const errorMsg = `Failed to fetch lecture content: ${lectureError?.message || 'No content found'}`
        console.error(errorMsg)
        return new Response(
          JSON.stringify({ success: false, error: errorMsg }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      content = lectureData.content
      title = lectureData.title || title
      
      console.log(`Successfully retrieved lecture content from database (${content.length} characters)`)
    } else {
      console.log(`Using provided lecture content (${content.length} characters)`)
    }
    
    if (!title) {
      console.log('No lecture title provided or found in database, using "Untitled Lecture"')
      title = "Untitled Lecture"
    }
    
    if (!content || content.trim().length === 0) {
      const errorMsg = 'No lecture content available to generate segments'
      console.error(errorMsg)
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // For demonstration, let's create a simple segmentation
    // In a real implementation, you would use AI to intelligently segment the content
    console.log('Generating segments for the lecture')
    
    const segmentCount = Math.min(5, Math.max(2, Math.floor(content.length / 2000)))
    console.log(`Creating ${segmentCount} segments based on content length`)
    
    const segments = []
    
    for (let i = 1; i <= segmentCount; i++) {
      const segmentTitle = `${title} - Part ${i}`
      const segmentDescription = `This segment covers part ${i} of the lecture content.`
      
      segments.push({
        lecture_id: lectureId,
        sequence_number: i,
        title: segmentTitle,
        segment_description: segmentDescription
      })
    }
    
    console.log(`Created ${segments.length} segments for insertion`)
    
    // Delete any existing segments for this lecture
    const { error: deleteError } = await supabase
      .from(segmentsTable)
      .delete()
      .eq('lecture_id', lectureId)
    
    if (deleteError) {
      console.warn(`Warning: Failed to delete existing segments: ${deleteError.message}`)
    } else {
      console.log('Successfully deleted any existing segments')
    }
    
    // Insert the new segments
    const { data: insertData, error: insertError } = await supabase
      .from(segmentsTable)
      .insert(segments)
      .select()
    
    if (insertError) {
      const errorMsg = `Failed to insert segments: ${insertError.message}`
      console.error(errorMsg)
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    console.log(`Successfully inserted ${segments.length} segments into the database`)
    
    // Return success response with segments data
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully generated ${segments.length} segments for lecture`,
        segments: segments
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Error in segment structure generation: ${errorMessage}`)
    console.error(error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Error generating segment structure: ${errorMessage}`,
        stack: error instanceof Error ? error.stack : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

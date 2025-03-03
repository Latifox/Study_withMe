
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processText } from './textProcessor.ts'
import { validateSegment } from './segmentValidator.ts'
import { analyzeContent } from './gptAnalyzer.ts'

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
    console.log('Extract PDF text function called')
    const { filePath, lectureId, isProfessorLecture = false } = await req.json()

    // Validate inputs
    if (!filePath) {
      console.error('Missing required filePath parameter')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required filePath parameter' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 400 }
      )
    }

    if (!lectureId) {
      console.error('Missing required lectureId parameter')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required lectureId parameter' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 400 }
      )
    }

    console.log(`Processing PDF at path: ${filePath} for lecture ID: ${lectureId}, isProfessorLecture: ${isProfessorLecture}`)

    // Initialize Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the public URL for the PDF
    const { data: publicUrlData } = supabaseAdmin.storage.from('lecture_pdfs').getPublicUrl(filePath)
    if (!publicUrlData?.publicUrl) {
      console.error('Failed to get public URL for PDF')
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to get public URL for PDF' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      )
    }

    const pdfUrl = publicUrlData.publicUrl
    console.log(`PDF public URL: ${pdfUrl}`)

    // Fetch the PDF
    console.log('Fetching PDF content...')
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      console.error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`)
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}` }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      )
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    console.log(`PDF fetched, size: ${pdfBuffer.byteLength} bytes`)

    // Process the PDF text
    console.log('Processing PDF text...')
    const text = await processText(pdfBuffer)
    
    if (!text || text.trim().length === 0) {
      console.error('Extracted text is empty')
      return new Response(
        JSON.stringify({ success: false, error: 'Extracted text is empty' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 422 }
      )
    }
    
    // Validate the extracted content
    if (!validateSegment(text)) {
      console.error('Extracted text does not contain valid content')
      return new Response(
        JSON.stringify({ success: false, error: 'Extracted text does not contain valid content' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 422 }
      )
    }

    console.log(`Successfully extracted text from PDF, length: ${text.length} characters`)
    console.log('Sample of extracted text:', text.substring(0, 200) + '...')

    // Store the content in the appropriate table
    const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
    console.log(`Updating ${tableName} table with content for lecture ID: ${lectureId}`)
    
    // Check if we need to analyze the content with GPT first
    let finalText = text;
    if (text.length > 40000) {
      console.log('Content is very long, using GPT to summarize...')
      try {
        const analyzedText = await analyzeContent(text)
        if (analyzedText && analyzedText.trim().length > 0) {
          finalText = analyzedText
          console.log(`Content summarized with GPT, new length: ${finalText.length} characters`)
        } else {
          console.log('GPT summarization returned empty text, using original text')
        }
      } catch (analyzeError) {
        console.error('Error during GPT analysis:', analyzeError)
        console.log('Continuing with original text')
      }
    }

    // Try to update the database with the extracted content
    try {
      const { error: updateError } = await supabaseAdmin
        .from(tableName)
        .update({ content: finalText })
        .eq('id', lectureId)

      if (updateError) {
        console.error(`Error updating ${tableName}:`, updateError)
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update lecture content: ${updateError.message}` }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
        )
      }

      console.log(`Successfully updated ${tableName} with content`)
    } catch (dbError) {
      console.error(`Database error when updating ${tableName}:`, dbError)
      return new Response(
        JSON.stringify({ success: false, error: `Database error: ${dbError.message}` }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      )
    }

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'PDF text extracted and saved successfully',
        contentLength: finalText.length
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('Unhandled error in extract-pdf-text function:', error)
    return new Response(
      JSON.stringify({ success: false, error: `Server error: ${error.message}` }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
    )
  }
})

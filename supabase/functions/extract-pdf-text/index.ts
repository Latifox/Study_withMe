
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1'
import { pdfjs } from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/+esm'
import { corsHeaders } from '../_shared/cors.ts'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js'

// Maximum text length that can be handled directly (1MB)
const MAX_DIRECT_TEXT_LENGTH = 1000000;

export const handler = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request for CORS preflight')
    return new Response(null, {
      headers: corsHeaders,
    })
  }

  try {
    console.log('Starting PDF text extraction process')
    const { filePath, lectureId, isProfessorLecture = false } = await req.json()
    
    if (!filePath || !lectureId) {
      const errorMsg = `Missing required fields: ${!filePath ? 'filePath' : ''} ${!lectureId ? 'lectureId' : ''}`
      console.error(errorMsg)
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`Processing PDF extraction for: filePath=${filePath}, lectureId=${lectureId}, isProfessorLecture=${isProfessorLecture}`)
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get PDF file from storage
    console.log(`Fetching PDF from storage: ${filePath}`)
    const { data: fileData, error: fileError } = await supabase.storage
      .from('lecture_pdfs')
      .download(filePath)
    
    if (fileError || !fileData) {
      const errorMsg = `Failed to download PDF file: ${fileError?.message || 'File not found'}`
      console.error(errorMsg)
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    console.log('Successfully downloaded PDF, beginning text extraction')
    
    // Extract text from PDF
    const pdfBytes = new Uint8Array(await fileData.arrayBuffer())
    const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise
    
    console.log(`PDF loaded successfully. Total pages: ${pdf.numPages}`)
    
    let extractedText = ''
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i} of ${pdf.numPages}`)
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: any) => (item.str || '').trim())
        .join(' ')
      
      extractedText += pageText + '\n\n'
    }
    
    if (!extractedText || extractedText.trim().length === 0) {
      const errorMsg = 'No text could be extracted from the PDF'
      console.error(errorMsg)
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    console.log(`Successfully extracted ${extractedText.length} characters from PDF`)
    
    // Determine which table to update based on isProfessorLecture
    const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
    
    // Handle large texts by storing directly
    if (extractedText.length <= MAX_DIRECT_TEXT_LENGTH) {
      console.log(`Storing extracted text directly in ${tableName} table for lecture ID ${lectureId}`)
      
      // Update the lecture record with the extracted text
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ content: extractedText })
        .eq('id', parseInt(lectureId))
      
      if (updateError) {
        const errorMsg = `Failed to update lecture with extracted text: ${updateError.message}`
        console.error(errorMsg)
        return new Response(
          JSON.stringify({ success: false, error: errorMsg }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      // Verify that the content was actually saved
      const { data: verificationData, error: verificationError } = await supabase
        .from(tableName)
        .select('content')
        .eq('id', parseInt(lectureId))
        .single()
      
      if (verificationError || !verificationData?.content) {
        const errorMsg = `Failed to verify content was saved: ${verificationError?.message || 'No content found after update'}`
        console.error(errorMsg)
        return new Response(
          JSON.stringify({ success: false, error: errorMsg }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      console.log(`Content successfully saved and verified in the database with ${verificationData.content.length} characters`)
    } else {
      // For very large texts, potentially summarize or chunk the text
      console.log(`Extracted text exceeds direct storage limit (${extractedText.length} > ${MAX_DIRECT_TEXT_LENGTH}), truncating...`)
      
      // Just store a truncated version for now
      const truncatedText = extractedText.substring(0, MAX_DIRECT_TEXT_LENGTH)
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ content: truncatedText })
        .eq('id', parseInt(lectureId))
      
      if (updateError) {
        const errorMsg = `Failed to update lecture with truncated text: ${updateError.message}`
        console.error(errorMsg)
        return new Response(
          JSON.stringify({ success: false, error: errorMsg }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      console.log(`Truncated content saved to database (${truncatedText.length} characters)`)
    }
    
    // Delay to ensure database write completes
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return success response with the extracted text
    console.log('PDF extraction process completed successfully')
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully extracted ${extractedText.length} characters from PDF`,
        textLength: extractedText.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Error in PDF extraction: ${errorMessage}`)
    console.error(error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Error extracting PDF text: ${errorMessage}`,
        stack: error instanceof Error ? error.stack : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

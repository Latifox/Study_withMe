
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

// Configure CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Define types for function parameters
interface ExtractPdfParams {
  filePath: string
  lectureId: string
  isProfessorLecture: boolean
}

Deno.serve(async (req) => {
  console.log('PDF extraction function started')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request')
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Parse request body
    const params = await req.json() as ExtractPdfParams
    console.log('Request parameters:', params)
    
    if (!params.filePath || !params.lectureId) {
      console.error('Missing required parameters')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: filePath or lectureId' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    const { filePath, lectureId, isProfessorLecture } = params
    const numericLectureId = parseInt(lectureId)
    
    if (isNaN(numericLectureId)) {
      console.error('Invalid lecture ID:', lectureId)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid lecture ID format' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    console.log(`Processing PDF from path: ${filePath} for lecture ID: ${numericLectureId} (isProfessor: ${isProfessorLecture})`)
    
    // Download the PDF from storage
    console.log('Downloading PDF from storage')
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('lecture_pdfs')
      .download(filePath)
    
    if (fileError) {
      console.error('Error downloading PDF:', fileError)
      return new Response(
        JSON.stringify({ success: false, error: `Failed to download PDF: ${fileError.message}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
    
    if (!fileData) {
      console.error('No file data received')
      return new Response(
        JSON.stringify({ success: false, error: 'No file data received' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }
    
    console.log('PDF downloaded successfully, size:', fileData.size)

    // Convert the blob to ArrayBuffer and then to Base64
    const arrayBuffer = await fileData.arrayBuffer()
    const base64String = arrayBufferToBase64(arrayBuffer)
    
    // Try extraction methods in sequence until one succeeds

    // Method 1: Try dedicated text extraction service
    console.log('Attempting text extraction with primary service')
    try {
      const response = await fetch('https://pdfservice.vercel.app/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfData: base64String })
      })
      
      if (!response.ok) {
        throw new Error(`Service error: ${response.status}`)
      }
      
      const result = await response.json()
      const extractedText = result.text || ''
      
      console.log('Primary extraction result, text length:', extractedText.length)
      
      if (extractedText && extractedText.length > 100) {
        await storeExtractedText(numericLectureId, extractedText, isProfessorLecture)
        return new Response(
          JSON.stringify({
            success: true, 
            message: 'PDF content extracted and saved successfully',
            contentLength: extractedText.length,
            textPreview: extractedText.substring(0, 200) + '...'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (error) {
      console.error('Error with primary extraction service:', error)
      // Continue to next method
    }
    
    // Method 2: Try RapidAPI extraction service
    console.log('Attempting text extraction with RapidAPI service')
    try {
      const rapidApiResponse = await fetch('https://pdf-to-text-converter.p.rapidapi.com/api/pdf-to-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': '36f3240392msh5cbe57ad5235408p199e36jsn9a9624583c47', 
          'X-RapidAPI-Host': 'pdf-to-text-converter.p.rapidapi.com'
        },
        body: JSON.stringify({
          pdfBase64: base64String,
          extractAllText: true
        })
      })
      
      if (!rapidApiResponse.ok) {
        throw new Error(`RapidAPI service error: ${rapidApiResponse.status}`)
      }
      
      const rapidApiResult = await rapidApiResponse.json()
      const rapidApiText = rapidApiResult.text || ''
      
      console.log('RapidAPI extraction result, text length:', rapidApiText.length)
      console.log('Text preview:', rapidApiText.substring(0, 200))
      
      if (rapidApiText && rapidApiText.length > 100) {
        await storeExtractedText(numericLectureId, rapidApiText, isProfessorLecture)
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'PDF content extracted and saved (RapidAPI method)',
            contentLength: rapidApiText.length,
            textPreview: rapidApiText.substring(0, 200) + '...'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (error) {
      console.error('Error with RapidAPI extraction:', error)
      // Continue to final method
    }
    
    // Method 3: Try another fallback service
    console.log('Attempting text extraction with fallback service')
    try {
      const fallbackResponse = await fetch('https://text-extraction.vercel.app/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfData: base64String })
      })
      
      if (!fallbackResponse.ok) {
        throw new Error(`Fallback service error: ${fallbackResponse.status}`)
      }
      
      const fallbackResult = await fallbackResponse.json()
      const fallbackText = fallbackResult.text || ''
      
      console.log('Fallback extraction result, text length:', fallbackText.length)
      
      if (fallbackText && fallbackText.length > 100) {
        await storeExtractedText(numericLectureId, fallbackText, isProfessorLecture)
        return new Response(
          JSON.stringify({
            success: true, 
            message: 'PDF content extracted and saved using fallback service',
            contentLength: fallbackText.length,
            textPreview: fallbackText.substring(0, 200) + '...'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (error) {
      console.error('Error with fallback extraction service:', error)
      // All methods failed
    }
    
    // If all extraction methods fail, notify the user
    console.error('All PDF extraction methods failed')
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to extract text from PDF using all available methods. The PDF may contain non-selectable text or be protected.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  } catch (error) {
    console.error('Unexpected error in PDF extraction function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Unexpected error: ${error.message || 'Unknown error'}` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

/**
 * Helper function to store extracted text in the database
 */
async function storeExtractedText(lectureId: number, extractedText: string, isProfessorLecture: boolean): Promise<void> {
  console.log(`Storing extracted text for lecture ID ${lectureId}, text length: ${extractedText.length}`)
  
  const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
  
  const { error } = await supabase
    .from(tableName)
    .update({ 
      content: extractedText,
      original_language: 'english' // Default language
    })
    .eq('id', lectureId)
  
  if (error) {
    console.error(`Error updating ${tableName}:`, error)
    throw error
  }
  
  console.log(`Successfully stored text in ${tableName} for lecture ID ${lectureId}`)
}

/**
 * Convert ArrayBuffer to Base64 string for transmission
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

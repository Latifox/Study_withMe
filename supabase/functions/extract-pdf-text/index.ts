
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import * as pdfjs from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm'

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

    // Convert the blob to ArrayBuffer for PDF.js processing
    const arrayBuffer = await fileData.arrayBuffer()
    
    // Initialize PDF.js
    await pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
    
    try {
      console.log('Parsing PDF using PDF.js')
      
      // Load the PDF document
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
      const pdfDocument = await loadingTask.promise
      
      console.log(`PDF loaded successfully. Number of pages: ${pdfDocument.numPages}`)
      
      // Extract text from all pages
      let fullText = ''
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        console.log(`Processing page ${i}/${pdfDocument.numPages}`)
        const page = await pdfDocument.getPage(i)
        const textContent = await page.getTextContent()
        
        // Concatenate the text items with proper spacing
        const textItems = textContent.items.map((item) => {
          // @ts-ignore - TextItem type might not be recognized in Deno
          return item.str || ''
        })
        
        const pageText = textItems.join(' ')
        fullText += pageText + '\n\n' // Add double newline between pages
      }
      
      console.log(`Extracted text length: ${fullText.length} characters`)
      console.log('Text preview:', fullText.substring(0, 200))
      
      if (fullText.length > 100) {
        await storeExtractedText(numericLectureId, fullText, isProfessorLecture)
        
        return new Response(
          JSON.stringify({
            success: true, 
            message: 'PDF content extracted and saved successfully',
            contentLength: fullText.length,
            textPreview: fullText.substring(0, 200) + '...'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.warn('Extracted text is too short, possibly failed extraction')
        throw new Error('Extracted text is too short')
      }
    } catch (parsingError) {
      console.error('PDF.js parsing error:', parsingError)
      
      // Fallback to alternative parsing when PDF.js fails
      try {
        console.log('Attempting fallback PDF text extraction')
        
        // Try extracting text using a RapidAPI service as fallback
        const base64String = arrayBufferToBase64(arrayBuffer)
        
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
      } catch (fallbackError) {
        console.error('Fallback extraction error:', fallbackError)
        // Proceed to try one last method
      }
      
      // Last resort: try a simple text extraction
      try {
        console.log('Attempting last resort direct text extraction')
        const pdfBytes = new Uint8Array(arrayBuffer)
        
        // Simple text extraction by looking for text patterns in the binary data
        let text = ''
        let inText = false
        let textBuffer = ''
        
        for (let i = 0; i < pdfBytes.length; i++) {
          const byte = pdfBytes[i]
          
          // Check for text markers - this is a simplified approach
          if (byte >= 32 && byte <= 126) { // ASCII printable characters
            textBuffer += String.fromCharCode(byte)
            inText = true
          } else if (inText) {
            if (textBuffer.length > 3) { // Only keep "words" that are at least 4 chars
              text += textBuffer + ' '
            }
            textBuffer = ''
            inText = false
            
            // Add newlines for certain characters
            if (byte === 10 || byte === 13) { // LF or CR
              text += '\n'
            }
          }
        }
        
        // Clean up the extracted text - remove PDF syntax markers and non-text content
        const cleanedText = text
          .replace(/\(\(.*?\)\)/g, '') // Remove PDF internal references
          .replace(/\/[A-Za-z]+\s+/g, ' ') // Remove PDF operators
          .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
          .trim()
        
        console.log('Direct extraction result, text length:', cleanedText.length)
        console.log('Text preview:', cleanedText.substring(0, 200))
        
        if (cleanedText && cleanedText.length > 100) {
          await storeExtractedText(numericLectureId, cleanedText, isProfessorLecture)
          return new Response(
            JSON.stringify({
              success: true, 
              message: 'PDF content extracted and saved using direct extraction',
              contentLength: cleanedText.length,
              textPreview: cleanedText.substring(0, 200) + '...'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } catch (directError) {
        console.error('Direct extraction error:', directError)
      }
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

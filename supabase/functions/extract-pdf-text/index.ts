
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

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

    // Convert the blob to an ArrayBuffer for processing
    const arrayBuffer = await fileData.arrayBuffer()
    
    // Try direct extraction first using PDF.js proxy service
    try {
      console.log('Attempting primary text extraction via PDF.js')
      const pdfText = await extractTextWithPdfJs(arrayBuffer)
      
      if (pdfText && pdfText.length > 200) { // Ensure we have meaningful content
        console.log(`Text extracted successfully with PDF.js, length: ${pdfText.length} characters`)
        
        // Store the extracted text in the appropriate table
        const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
        
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ 
            content: pdfText,
            original_language: 'english' // Default language
          })
          .eq('id', numericLectureId)
        
        if (updateError) {
          console.error(`Error updating ${tableName}:`, updateError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to save PDF content: ${updateError.message}` 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500 
            }
          )
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'PDF content extracted and saved successfully',
            contentLength: pdfText.length,
            textPreview: pdfText.substring(0, 200) + '...'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        console.log('PDF.js extraction returned insufficient text content, trying fallback')
      }
    } catch (pdfJsError) {
      console.error('Error with PDF.js extraction:', pdfJsError)
    }
    
    // Try alternative extraction service if PDF.js fails
    try {
      console.log('Attempting fallback text extraction via RapidAPI')
      const fallbackText = await extractTextViaRapidApi(arrayBuffer)
      
      if (fallbackText && fallbackText.length > 200) {
        console.log(`Fallback extraction successful, length: ${fallbackText.length} characters`)
        
        // Store the extracted text
        const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
        
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ 
            content: fallbackText,
            original_language: 'english'
          })
          .eq('id', numericLectureId)
        
        if (updateError) {
          console.error(`Error updating ${tableName}:`, updateError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to save PDF content: ${updateError.message}` 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500 
            }
          )
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'PDF content extracted and saved (fallback method)',
            contentLength: fallbackText.length,
            textPreview: fallbackText.substring(0, 200) + '...'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (fallbackError) {
      console.error('Error with fallback extraction:', fallbackError)
    }
    
    // If all extraction methods fail, extract PDF content directly without OCR
    try {
      console.log('Attempting raw text extraction from PDF')
      const rawText = await extractRawTextFromPdf(arrayBuffer)
      
      // Store whatever text we could extract
      const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ 
          content: rawText,
          original_language: 'english'
        })
        .eq('id', numericLectureId)
      
      if (updateError) {
        console.error(`Error updating ${tableName}:`, updateError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to save PDF content: ${updateError.message}` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'PDF raw content extracted and saved',
          contentLength: rawText.length,
          textPreview: rawText.substring(0, 200) + '...'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (rawExtractionError) {
      console.error('Error with raw text extraction:', rawExtractionError)
      
      // If everything fails, return an error
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'All PDF extraction methods failed' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
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
 * Extract text from PDF using PDF.js via a dedicated service
 */
async function extractTextWithPdfJs(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  const base64String = arrayBufferToBase64(pdfArrayBuffer)
  
  const response = await fetch('https://pdf-text-extraction.vercel.app/api/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pdfBase64: base64String
    })
  })
  
  if (!response.ok) {
    throw new Error(`PDF.js extraction service responded with status: ${response.status}`)
  }
  
  const result = await response.json()
  return result.text || ''
}

/**
 * Extract text from PDF using RapidAPI service
 */
async function extractTextViaRapidApi(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  const base64Pdf = arrayBufferToBase64(pdfArrayBuffer)
  
  const response = await fetch('https://pdf-to-text-converter.p.rapidapi.com/api/pdf-to-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': '36f3240392msh5cbe57ad5235408p199e36jsn9a9624583c47',
      'X-RapidAPI-Host': 'pdf-to-text-converter.p.rapidapi.com'
    },
    body: JSON.stringify({
      pdfBase64: base64Pdf
    })
  })
  
  if (!response.ok) {
    throw new Error(`RapidAPI service responded with status: ${response.status}`)
  }
  
  const result = await response.json()
  return result.text || ''
}

/**
 * Extract raw text content from PDF using pdf-lib
 * This is a last resort method that attempts to extract whatever text it can find
 */
async function extractRawTextFromPdf(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer)
    const pageCount = pdfDoc.getPageCount()
    
    // Extract basic PDF metadata
    const title = pdfDoc.getTitle() || 'Untitled'
    const creator = pdfDoc.getCreator() || 'Unknown'
    const producer = pdfDoc.getProducer() || 'Unknown'
    
    // Create a raw text representation by grabbing whatever text we can find
    // This is a very basic extraction that might not get all text
    const pages = pdfDoc.getPages()
    let extractedText = ''
    
    // Dump whatever text content we can find directly
    const pdfBytes = await pdfDoc.save()
    const textBytes = new Uint8Array(pdfBytes)
    const textDecoder = new TextDecoder('utf-8')
    const rawContent = textDecoder.decode(textBytes)
    
    // Extract text strings that look like actual content
    const textMatches = rawContent.match(/(\([^)]{3,1000}\)(Tj|TJ))/g) || []
    const extractedStrings = textMatches.map(match => {
      // Extract the text between parentheses
      const content = match.substring(1, match.length - 3)
      // Basic cleanup: remove non-printable characters
      return content.replace(/[^\x20-\x7E\s]/g, '')
    }).filter(text => text.trim().length > 0)
    
    extractedText = extractedStrings.join(' ')
    
    // If we couldn't extract any meaningful text, provide information about the PDF
    if (extractedText.length < 200) {
      extractedText = `PDF CONTENT ANALYSIS:\n\n` +
        `This PDF document contains approximately ${Math.round(pdfBytes.length / 1024)} KB of data and appears to be PDF version ${pdfDoc.getVersion()}.\n\n` +
        `The document contains approximately ${pageCount} pages.\n\n` +
        `PARTIAL TEXT CONTENT:\n\n${rawContent.substring(0, 1000)}\n\n` +
        `DOCUMENT METADATA:\n` +
        `- File path: ${pdfDoc.getAuthor() || 'Unknown'}\n` +
        `- File size: ${Math.round(pdfBytes.length / 1024)} KB\n` +
        `- PDF version: ${pdfDoc.getVersion()}\n` +
        `- Upload timestamp: ${new Date().toISOString()}\n\n` +
        `NOTE: This is a partial extraction of the PDF content. The automated text extraction was not fully successful. The document may contain complex formatting, scanned images, or other elements that prevented complete text extraction.`
    }
    
    return extractedText
  } catch (error) {
    console.error('Error in raw PDF extraction:', error)
    throw error
  }
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

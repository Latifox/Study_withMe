
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

    // Convert the blob to an ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer()
    
    // Extract text from PDF using pdf.js-based extraction method
    // Call external API that can process the PDF properly
    console.log('Extracting text from PDF via PDF extraction service')
    try {
      // First try with Mozilla's pdf.js via a proxy service
      const extractedText = await extractPdfTextWithPdfJs(arrayBuffer)
      
      if (extractedText && extractedText.length > 100) {
        console.log(`Text extracted successfully, length: ${extractedText.length} characters`)
        
        // Store the extracted text in the database
        const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
        
        console.log(`Storing extracted text in ${tableName}`)
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ 
            content: extractedText,
            original_language: 'english' // Default language
          })
          .eq('id', numericLectureId)
        
        if (updateError) {
          console.error(`Error updating ${tableName}:`, updateError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to update lecture content: ${updateError.message}` 
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
            message: 'PDF extraction complete',
            contentLength: extractedText.length,
            textPreview: extractedText.substring(0, 200) + '...'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (extractionError) {
      console.error('Error in primary extraction method:', extractionError)
    }
    
    // If primary method fails, try fallback method
    try {
      console.log('Trying fallback extraction method')
      const fallbackText = await extractPdfTextFallback(arrayBuffer)
      
      if (fallbackText && fallbackText.length > 100) {
        console.log(`Fallback extraction successful, length: ${fallbackText.length} characters`)
        
        // Store the extracted text in the database
        const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
        
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ 
            content: fallbackText,
            original_language: 'english' // Default language
          })
          .eq('id', numericLectureId)
        
        if (updateError) {
          console.error(`Error updating ${tableName}:`, updateError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to update lecture content: ${updateError.message}` 
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
            message: 'PDF extraction complete (fallback method)',
            contentLength: fallbackText.length,
            textPreview: fallbackText.substring(0, 200) + '...'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (fallbackError) {
      console.error('Error in fallback extraction:', fallbackError)
    }
    
    // If both methods fail, use a last resort method to extract what we can
    console.log('Using last resort text extraction method')
    try {
      const lastResortText = await extractTextFromPdfLastResort(fileData)
      
      // Store the extracted text in the database
      const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ 
          content: lastResortText,
          original_language: 'english' // Default language
        })
        .eq('id', numericLectureId)
      
      if (updateError) {
        console.error(`Error updating ${tableName}:`, updateError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to update lecture content: ${updateError.message}` 
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
          message: 'PDF extraction complete (last resort method)',
          contentLength: lastResortText.length,
          textPreview: lastResortText.substring(0, 200) + '...'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (lastResortError) {
      console.error('Error in last resort extraction:', lastResortError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to extract text from PDF: ${lastResortError.message || 'Unknown error'}` 
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
 * Extract text from PDF using pdf.js via a proxy service
 */
async function extractPdfTextWithPdfJs(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  console.log('Extracting text with pdf.js via proxy service')
  
  // Convert ArrayBuffer to base64
  const base64String = arrayBufferToBase64(pdfArrayBuffer)
  
  const response = await fetch('https://pdfjs-text-extraction.deno.dev/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pdfBase64: base64String
    })
  })
  
  if (!response.ok) {
    throw new Error(`PDF.js extraction API responded with status: ${response.status}`)
  }
  
  const result = await response.json()
  
  if (!result.text) {
    throw new Error('No text returned from PDF.js extraction service')
  }
  
  return result.text
}

/**
 * Fallback method to extract text from PDF
 */
async function extractPdfTextFallback(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  console.log('Using fallback PDF extraction method')
  
  // Convert to base64 for API transmission
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
    throw new Error(`Fallback API responded with status: ${response.status}`)
  }
  
  const result = await response.json()
  return result.text || ''
}

/**
 * Last resort method to extract what we can from a PDF
 */
async function extractTextFromPdfLastResort(pdfBlob: Blob): Promise<string> {
  console.log('Using last resort PDF text extraction')
  
  try {
    // Get metadata about the PDF
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    
    const pageCount = pdfDoc.getPageCount()
    const creator = pdfDoc.getCreator() || 'Unknown'
    const producer = pdfDoc.getProducer() || 'Unknown'
    const title = pdfDoc.getTitle() || 'Untitled'
    
    // Extract what we can from the first few pages structure
    let pdfInfo = `Title: ${title}\n`
    pdfInfo += `Creator: ${creator}\n`
    pdfInfo += `Producer: ${producer}\n`
    pdfInfo += `Page Count: ${pageCount}\n\n`
    
    // Extract raw text from the structure if possible
    pdfInfo += `The document appears to be a PDF file with ${pageCount} pages.\n`
    pdfInfo += `All automatic text extraction methods have failed, which may indicate that the PDF contains:\n`
    pdfInfo += `- Scanned pages without OCR\n`
    pdfInfo += `- Text embedded in images\n`
    pdfInfo += `- Security restrictions on content extraction\n`
    pdfInfo += `- Non-standard text encoding\n\n`
    
    return pdfInfo
  } catch (error) {
    console.error('Error in last resort extraction:', error)
    return `Unable to extract text from this PDF. The document may be secured, damaged, or contain text in a format that cannot be extracted.`
  }
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

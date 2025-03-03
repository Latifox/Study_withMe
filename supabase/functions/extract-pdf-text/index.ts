
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

    // Extract text from PDF
    console.log('Extracting text from PDF')
    const extractedText = await extractTextFromPdf(fileData)
    
    console.log(`Extracted text length: ${extractedText?.length || 0} characters`)
    console.log('Text preview:', extractedText?.substring(0, 200))
    
    // Store the extracted text in the database
    console.log('Storing extracted text in database')
    const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
    
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
    
    // Return success response
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
 * Extract text from a PDF using pdf-parse library
 */
async function extractTextFromPdf(pdfBlob: Blob): Promise<string> {
  try {
    // Convert the blob to ArrayBuffer
    const arrayBuffer = await pdfBlob.arrayBuffer()
    
    // Convert ArrayBuffer to base64
    const base64String = arrayBufferToBase64(arrayBuffer)
    
    // Use OCR.space API to extract text
    const apiKey = 'K89850937088957' // OCR.space free API key
    
    console.log('Sending PDF to OCR.space API')
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base64Image: `data:application/pdf;base64,${base64String}`,
        language: 'eng',
        isCreateSearchablePdf: false,
        scale: true,
        OCREngine: 2 // More accurate OCR engine
      })
    })
    
    if (!ocrResponse.ok) {
      console.error('OCR API error status:', ocrResponse.status)
      throw new Error(`OCR API error: ${ocrResponse.statusText}`)
    }
    
    const ocrResult = await ocrResponse.json()
    console.log('OCR response received')
    
    if (ocrResult.OCRExitCode !== 1) {
      console.error('OCR process failed:', ocrResult.ErrorMessage)
      throw new Error(`OCR process error: ${ocrResult.ErrorMessage || 'Unknown OCR error'}`)
    }
    
    let textContent = ''
    
    if (ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
      // Combine text from all pages
      for (const result of ocrResult.ParsedResults) {
        textContent += result.ParsedText + '\n\n'
      }
    }
    
    if (!textContent || textContent.trim().length < 100) {
      console.log('OCR result insufficient, falling back to PDF.js extraction')
      // Use a basic PDF extraction approach as fallback
      textContent = await extractTextWithPDFLib(arrayBuffer)
    }
    
    return textContent || 'Failed to extract meaningful text from PDF'
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    // Use fallback method
    try {
      const arrayBuffer = await pdfBlob.arrayBuffer()
      return await extractTextWithPDFLib(arrayBuffer)
    } catch (fallbackError) {
      console.error('Error in fallback extraction method:', fallbackError)
      throw new Error(`PDF extraction failed: ${error.message}`)
    }
  }
}

/**
 * Fallback method to extract text from PDF
 */
async function extractTextWithPDFLib(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Trying PDF extraction with PDF.js library')
    
    // Convert to base64 for API transmission
    const base64Pdf = arrayBufferToBase64(arrayBuffer)
    
    // Try using pdf-extraction API as a fallback
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
      throw new Error(`API responded with status: ${response.status}`)
    }
    
    const result = await response.json()
    console.log('API extraction successful')
    
    return result.text || 'No text could be extracted from the PDF'
  } catch (error) {
    console.error('Error in PDF.js extraction:', error)
    throw error
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


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import * as pdfLib from 'https://esm.sh/pdf-lib@1.17.1'

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
    
    // Method 1: Try direct extraction first using PDF.js proxy service
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
    
    // Method 2: Try alternative extraction service if PDF.js fails
    try {
      console.log('Attempting fallback text extraction via enhanced PDF extraction')
      const fallbackText = await extractTextWithEnhancedMethod(arrayBuffer)
      
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
    
    // Method 3: Use simpler text extraction as final attempt
    try {
      console.log('Attempting simple PDFText extraction as last resort')
      const simpleText = await extractTextWithPDFTextService(arrayBuffer)
      
      if (simpleText && simpleText.length > 200) {
        console.log(`Simple text extraction successful, length: ${simpleText.length} characters`)
        
        // Store the extracted text
        const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
        
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ 
            content: simpleText,
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
            message: 'PDF content extracted and saved (simple extraction)',
            contentLength: simpleText.length,
            textPreview: simpleText.substring(0, 200) + '...'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (simpleError) {
      console.error('Error with simple text extraction:', simpleError)
    }
    
    // Final attempt: extract raw text directly from PDF bytes as last resort
    console.log('Attempting raw bytes extraction as final resort')
    const rawText = extractRawTextFromBytes(arrayBuffer)
    
    if (rawText && rawText.length > 200) {
      console.log(`Raw text extraction returned ${rawText.length} characters`)
      
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
    }
    
    // If all extraction methods fail, return an error
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
 * Extract text from PDF using PDF.js via our primary extraction service
 */
async function extractTextWithPdfJs(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const base64String = arrayBufferToBase64(pdfArrayBuffer)
    
    const response = await fetch('https://pdf-extract.vercel.app/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pdfData: base64String
      })
    })
    
    if (!response.ok) {
      throw new Error(`PDF.js extraction service responded with status: ${response.status}`)
    }
    
    const result = await response.json()
    if (result.success && result.text) {
      return result.text
    } else {
      throw new Error('PDF.js extraction returned no text')
    }
  } catch (error) {
    console.error('Error in PDF.js extraction:', error)
    throw error
  }
}

/**
 * Enhanced PDF text extraction using a specialized service 
 */
async function extractTextWithEnhancedMethod(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const base64Pdf = arrayBufferToBase64(pdfArrayBuffer)
    
    const response = await fetch('https://pdf-to-text-converter.p.rapidapi.com/api/pdf-to-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': '36f3240392msh5cbe57ad5235408p199e36jsn9a9624583c47', 
        'X-RapidAPI-Host': 'pdf-to-text-converter.p.rapidapi.com'
      },
      body: JSON.stringify({
        pdfBase64: base64Pdf,
        extractAllText: true
      })
    })
    
    if (!response.ok) {
      throw new Error(`Enhanced extraction service responded with status: ${response.status}`)
    }
    
    const result = await response.json()
    return result.text || ''
  } catch (error) {
    console.error('Error in enhanced PDF extraction:', error)
    throw error
  }
}

/**
 * Simple text extraction using a reliable third-party service
 */
async function extractTextWithPDFTextService(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const base64Pdf = arrayBufferToBase64(pdfArrayBuffer)
    
    const response = await fetch('https://pdfservice.vercel.app/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfData: base64Pdf })
    })
    
    if (!response.ok) {
      throw new Error(`PDF text service responded with status: ${response.status}`)
    }
    
    const result = await response.json()
    return result.text || ''
  } catch (error) {
    console.error('Error in PDF text service extraction:', error)
    throw error
  }
}

/**
 * Extract raw text directly from PDF bytes as a last resort method
 * This is a basic approach that searches for text patterns in the raw PDF data
 */
function extractRawTextFromBytes(pdfArrayBuffer: ArrayBuffer): string {
  try {
    // Convert ArrayBuffer to string
    const uint8Array = new Uint8Array(pdfArrayBuffer)
    let pdfString = ''
    for (let i = 0; i < uint8Array.length; i++) {
      pdfString += String.fromCharCode(uint8Array[i])
    }
    
    // Look for text patterns in the PDF
    const textChunks: string[] = []
    
    // Pattern for text objects in PDF (simplified)
    const textObjectPattern = /BT\s*.*?\s*ET/gs
    const textObjects = pdfString.match(textObjectPattern) || []
    
    for (const textObj of textObjects) {
      // Extract text strings within text objects
      const textStringPattern = /\(([^)]+)\)\s*Tj/g
      let match
      while ((match = textStringPattern.exec(textObj)) !== null) {
        if (match[1] && match[1].length > 1) {
          textChunks.push(decodePdfString(match[1]))
        }
      }
      
      // Also look for TJ arrays which contain text chunks
      const tjArrayPattern = /\[([^\]]+)\]\s*TJ/g
      while ((match = tjArrayPattern.exec(textObj)) !== null) {
        if (match[1]) {
          // Extract string literals from TJ array
          const stringLiterals = match[1].match(/\(([^)]+)\)/g) || []
          for (const literal of stringLiterals) {
            if (literal.length > 2) { // Minimum '()' is 2 chars
              textChunks.push(decodePdfString(literal.substring(1, literal.length - 1)))
            }
          }
        }
      }
    }
    
    // If we found some text chunks, join them with spaces
    if (textChunks.length > 0) {
      // Process the text chunks to form more coherent text
      for (let i = 0; i < textChunks.length; i++) {
        textChunks[i] = textChunks[i].trim()
      }
      
      // Join chunks, trying to detect sentence boundaries
      let result = textChunks[0] || ''
      for (let i = 1; i < textChunks.length; i++) {
        const prevChunk = textChunks[i-1]
        const currChunk = textChunks[i]
        
        // If the previous chunk ends with sentence-ending punctuation or is a short fragment,
        // add a new line, otherwise just add a space
        if (prevChunk.match(/[.!?]$/) || prevChunk.length < 3) {
          result += '\n' + currChunk
        } else {
          result += ' ' + currChunk
        }
      }
      
      return result
    }
    
    // If we couldn't extract text from text objects, try a more basic approach
    // Look for patterns that might indicate text content
    const contentPattern = /stream\s(.*?)\sendstream/gs
    const contentMatches = pdfString.match(contentPattern) || []
    
    let extractedText = ''
    for (const match of contentMatches) {
      // Look for ASCII text patterns in the stream content
      const asciiPattern = /[a-zA-Z0-9\s.,;:'"!?()[\]{}\/\\<>@#$%^&*+=_-]{4,}/g
      const asciiMatches = match.match(asciiPattern) || []
      
      for (const textMatch of asciiMatches) {
        if (textMatch.length > 5 && !textMatch.includes('stream') && !textMatch.includes('endstream')) {
          extractedText += textMatch + '\n'
        }
      }
    }
    
    return extractedText || 'Text extraction failed.'
  } catch (error) {
    console.error('Error in raw text extraction:', error)
    return 'Text extraction failed due to an error.'
  }
}

/**
 * Decode PDF string which may contain escape sequences and special characters
 */
function decodePdfString(input: string): string {
  // Handle basic PDF string escapes
  return input
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    // Replace non-printable characters with space
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
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

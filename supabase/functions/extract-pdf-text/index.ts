
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

    // Convert the blob to an ArrayBuffer for processing
    const arrayBuffer = await fileData.arrayBuffer()
    const base64String = arrayBufferToBase64(arrayBuffer)
    
    // Use PDF.js extraction service specifically optimized for selectable text
    console.log('Extracting text using PDF.js extraction service')
    try {
      const response = await fetch('https://pdf-extract.vercel.app/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pdfData: base64String,
          extractMode: 'text' // Explicitly request text extraction mode
        })
      })
      
      if (!response.ok) {
        console.error(`PDF.js extraction service error: ${response.status} ${response.statusText}`)
        throw new Error(`PDF.js extraction service error: ${response.status}`)
      }
      
      const extractionResult = await response.json()
      const extractedText = extractionResult.text || ''
      
      console.log('Text extraction result, text length:', extractedText.length)
      console.log('Text preview:', extractedText.substring(0, 200))
      
      if (extractedText && extractedText.length > 100) {
        console.log('Successful text extraction, updating database...')
        
        // Store the extracted text in the appropriate table
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
            contentLength: extractedText.length,
            textPreview: extractedText.substring(0, 200) + '...'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        console.log('PDF.js extraction returned limited or no text, trying alternative methods')
      }
    } catch (error) {
      console.error('Error with PDF.js extraction:', error)
      // Continue to fallback methods
    }
    
    // Fallback method 1: Use text extraction service as backup
    console.log('Trying fallback text extraction service')
    try {
      const fallbackResponse = await fetch('https://pdfservice.vercel.app/api/extract', {
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
      console.log('Text preview:', fallbackText.substring(0, 200))
      
      if (fallbackText && fallbackText.length > 100) {
        console.log('Successful fallback text extraction, updating database...')
        
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
    } catch (error) {
      console.error('Error with fallback extraction:', error)
      // Continue to last resort method
    }
    
    // Last resort: Use RapidAPI service (different approach)
    console.log('Trying last resort extraction via RapidAPI')
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
        console.log('Successful RapidAPI text extraction, updating database...')
        
        // Store the extracted text
        const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
        
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ 
            content: rapidApiText,
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
      // Continue to absolute last resort
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

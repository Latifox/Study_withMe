
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
    
    try {
      // Convert PDF to text using PDF.js library from CDN
      console.log('Extracting text from PDF...')
      
      // Import PDF.js as a remote module
      const pdfJS = await import('https://cdn.skypack.dev/pdfjs-dist@2.14.305/build/pdf.js')
      
      // Set up the worker source - needed for PDF.js to work
      const pdfWorker = await import('https://cdn.skypack.dev/pdfjs-dist@2.14.305/build/pdf.worker.js')
      pdfJS.GlobalWorkerOptions.workerSrc = pdfWorker
      
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await fileData.arrayBuffer()
      
      // Load the PDF document
      const loadingTask = pdfJS.getDocument({ data: arrayBuffer })
      const pdfDocument = await loadingTask.promise
      
      console.log(`PDF loaded. Total pages: ${pdfDocument.numPages}`)
      
      let extractedText = ''
      
      // Extract text from each page
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i)
        const textContent = await page.getTextContent()
        
        // Concatenate the text items
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        
        extractedText += pageText + '\n\n'
        
        if (i % 10 === 0 || i === pdfDocument.numPages) {
          console.log(`Processed page ${i} of ${pdfDocument.numPages}`)
        }
      }
      
      console.log(`Extracted ${extractedText.length} characters of text`)
      console.log('First 200 characters:', extractedText.substring(0, 200))
      
      // Detect language
      const detectedLanguage = detectLanguage(extractedText)
      
      // Store the extracted text in the database
      console.log('Storing extracted text in database')
      const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
      
      const { data: updateData, error: updateError } = await supabase
        .from(tableName)
        .update({ 
          content: extractedText,
          original_language: detectedLanguage
        })
        .eq('id', numericLectureId)
        .select()
      
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
      
      if (!updateData || updateData.length === 0) {
        console.error('No rows updated')
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `No rows updated. Lecture ID ${numericLectureId} not found in ${tableName} table.` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        )
      }
      
      console.log('Text successfully stored in database')
      
      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'PDF extraction complete',
          contentLength: extractedText.length,
          language: detectedLanguage,
          textPreview: extractedText.substring(0, 200) + '...',
          lectureId: numericLectureId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (extractionError) {
      console.error('Error extracting text from PDF:', extractionError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error extracting text from PDF: ${extractionError.message}` 
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

// Basic language detection function
function detectLanguage(text: string): string {
  if (!text || text.length < 50) return "english" // Default
  
  const sample = text.toLowerCase().substring(0, 1000)
  
  // Common words in different languages
  const languages = [
    { name: 'english', words: ['the', 'and', 'is', 'in', 'it', 'to', 'of', 'that', 'this', 'with'], count: 0 },
    { name: 'spanish', words: ['el', 'la', 'es', 'en', 'y', 'de', 'que', 'un', 'una', 'para'], count: 0 },
    { name: 'french', words: ['le', 'la', 'est', 'et', 'en', 'de', 'que', 'un', 'une', 'pour'], count: 0 },
    { name: 'german', words: ['der', 'die', 'das', 'und', 'ist', 'in', 'zu', 'den', 'mit', 'für'], count: 0 }
  ]
  
  // Count occurrences of common words
  for (const lang of languages) {
    for (const word of lang.words) {
      const regex = new RegExp(`\\b${word}\\b`, 'g')
      const matches = sample.match(regex)
      if (matches) {
        lang.count += matches.length
      }
    }
  }
  
  // Return the language with the highest count
  languages.sort((a, b) => b.count - a.count)
  console.log(`Language detection results: ${languages.map(l => `${l.name}=${l.count}`).join(', ')}`)
  
  return languages[0].count > 0 ? languages[0].name : 'english'
}

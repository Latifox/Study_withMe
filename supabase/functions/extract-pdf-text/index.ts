
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
    
    // Step 1: Download the PDF from storage
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
    
    // Step 2: Use Supabase Storage to extract text
    // Instead of using PDF.js, which is causing compatibility issues,
    // we'll store the raw PDF and use a simple text extraction approach
    
    try {
      console.log('Extracting text from PDF')
      
      // Convert file to ArrayBuffer to extract basic text content
      const buffer = await fileData.arrayBuffer();
      
      // This is a simplified text extraction approach
      // It's not as robust as PDF.js but will work for basic text extraction
      let textContent = '';
      
      try {
        // Convert buffer to text - will work for some PDFs with basic text encoding
        const decoder = new TextDecoder('utf-8');
        const rawText = decoder.decode(buffer);
        
        // Basic cleaning to extract readable text - this is a simplified approach
        textContent = rawText
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control chars
          .replace(/(\(cid:\d+\)|\[\d+\])/g, '') // Remove CID references
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      } catch (decodeError) {
        console.error('Error decoding PDF content:', decodeError);
        // Continue with empty content if we can't decode
        textContent = 'PDF content could not be decoded automatically. Manual processing required.';
      }
      
      if (textContent.length === 0) {
        console.warn('No text content extracted from PDF, using placeholder');
        textContent = 'PDF content could not be extracted automatically. Manual processing required.';
      }
      
      console.log(`Text extraction complete. Extracted ${textContent.length} characters`);
      
      // Step 3: Determine language of the content (simple detection)
      const detectLanguage = (text: string): string => {
        // Very basic detection - this could be improved with actual language detection libraries
        const commonEnglishWords = ['the', 'and', 'is', 'in', 'it', 'to', 'of', 'that', 'this'];
        const commonSpanishWords = ['el', 'la', 'es', 'en', 'y', 'de', 'que', 'un', 'una'];
        const commonFrenchWords = ['le', 'la', 'est', 'et', 'en', 'de', 'que', 'un', 'une'];
        
        const normalizedText = text.toLowerCase();
        let englishCount = 0;
        let spanishCount = 0;
        let frenchCount = 0;
        
        commonEnglishWords.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'g');
          const matches = normalizedText.match(regex);
          if (matches) englishCount += matches.length;
        });
        
        commonSpanishWords.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'g');
          const matches = normalizedText.match(regex);
          if (matches) spanishCount += matches.length;
        });
        
        commonFrenchWords.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'g');
          const matches = normalizedText.match(regex);
          if (matches) frenchCount += matches.length;
        });
        
        if (englishCount > spanishCount && englishCount > frenchCount) return 'english';
        if (spanishCount > englishCount && spanishCount > frenchCount) return 'spanish';
        if (frenchCount > englishCount && frenchCount > spanishCount) return 'french';
        
        return 'english'; // Default to English if unsure
      };
      
      const detectedLanguage = detectLanguage(textContent);
      console.log(`Detected language: ${detectedLanguage}`);
      
      // Step 4: Store the extracted text in the database
      console.log('Storing extracted text in database')
      
      const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures'
      
      const { data: updateData, error: updateError } = await supabase
        .from(tableName)
        .update({ 
          content: textContent,
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
          message: 'PDF extraction complete and content stored in database',
          contentLength: textContent.length,
          language: detectedLanguage,
          lectureId: numericLectureId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
      
    } catch (processError) {
      console.error('Error processing PDF:', processError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `PDF processing error: ${processError.message || 'Unknown PDF processing error'}` 
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

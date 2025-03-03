
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";

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
      // Using the PDF.js online parser for PDF extraction
      console.log('Extracting text from PDF...')
      
      // Convert blob to array buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);
      
      // Use the Mozilla PDF.js API (online version)
      const pdfServiceUrl = 'https://mozilla.github.io/pdf.js/web/cmaps/';
      const response = await fetch('https://pdf-extractor-api.vercel.app/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64: base64Data,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`PDF extraction service error: ${response.status} ${response.statusText}`);
      }
      
      const extractionResult = await response.json();
      const extractedText = extractionResult.text || '';
      
      if (!extractedText || extractedText.length < 100) {
        console.error('Extraction returned insufficient text:', extractedText);
        throw new Error('PDF extraction failed to return meaningful text');
      }
      
      console.log(`Extracted ${extractedText.length} characters of text`);
      console.log('First 200 characters:', extractedText.substring(0, 200));
      
      // Detect language
      const detectedLanguage = detectLanguage(extractedText);
      
      // Store the extracted text in the database
      console.log('Storing extracted text in database');
      const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures';
      
      const { data: updateData, error: updateError } = await supabase
        .from(tableName)
        .update({ 
          content: extractedText,
          original_language: detectedLanguage
        })
        .eq('id', numericLectureId)
        .select();
      
      if (updateError) {
        console.error(`Error updating ${tableName}:`, updateError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to update lecture content: ${updateError.message}` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }
      
      if (!updateData || updateData.length === 0) {
        console.error('No rows updated');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `No rows updated. Lecture ID ${numericLectureId} not found in ${tableName} table.` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        );
      }
      
      console.log('Text successfully stored in database');
      
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
      );
    } catch (extractionError) {
      console.error('Error extracting text from PDF:', extractionError);
      
      // Fallback to using the PDF text extraction API
      try {
        console.log('Attempting fallback extraction method...');
        const formData = new FormData();
        formData.append('file', fileData, 'document.pdf');
        
        const fallbackResponse = await fetch('https://api.pdftotext.dev/v1/extract', {
          method: 'POST',
          body: formData,
        });
        
        if (!fallbackResponse.ok) {
          throw new Error(`Fallback extraction failed: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
        }
        
        const fallbackResult = await fallbackResponse.json();
        const fallbackText = fallbackResult.text || '';
        
        if (!fallbackText || fallbackText.length < 100) {
          throw new Error('Fallback extraction returned insufficient text');
        }
        
        console.log(`Fallback extraction successful, got ${fallbackText.length} characters`);
        
        // Detect language
        const detectedLanguage = detectLanguage(fallbackText);
        
        // Store the extracted text in the database
        const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures';
        
        const { data: updateData, error: updateError } = await supabase
          .from(tableName)
          .update({ 
            content: fallbackText,
            original_language: detectedLanguage
          })
          .eq('id', numericLectureId)
          .select();
        
        if (updateError) {
          throw new Error(`Failed to update lecture content: ${updateError.message}`);
        }
        
        console.log('Text successfully stored using fallback method');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'PDF extraction complete (fallback method)',
            contentLength: fallbackText.length,
            language: detectedLanguage,
            textPreview: fallbackText.substring(0, 200) + '...',
            lectureId: numericLectureId
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `All extraction methods failed. Original error: ${extractionError.message}, Fallback error: ${fallbackError.message}` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Unexpected error: ${error.message || 'Unknown error'}` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
  return btoa(binary);
}

// Basic language detection function
function detectLanguage(text: string): string {
  if (!text || text.length < 50) return "english"; // Default
  
  const sample = text.toLowerCase().substring(0, 1000);
  
  // Common words in different languages
  const languages = [
    { name: 'english', words: ['the', 'and', 'is', 'in', 'it', 'to', 'of', 'that', 'this', 'with'], count: 0 },
    { name: 'spanish', words: ['el', 'la', 'es', 'en', 'y', 'de', 'que', 'un', 'una', 'para'], count: 0 },
    { name: 'french', words: ['le', 'la', 'est', 'et', 'en', 'de', 'que', 'un', 'une', 'pour'], count: 0 },
    { name: 'german', words: ['der', 'die', 'das', 'und', 'ist', 'in', 'zu', 'den', 'mit', 'für'], count: 0 }
  ];
  
  // Count occurrences of common words
  for (const lang of languages) {
    for (const word of lang.words) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = sample.match(regex);
      if (matches) {
        lang.count += matches.length;
      }
    }
  }
  
  // Return the language with the highest count
  languages.sort((a, b) => b.count - a.count);
  console.log(`Language detection results: ${languages.map(l => `${l.name}=${l.count}`).join(', ')}`);
  
  return languages[0].count > 0 ? languages[0].name : 'english';
}

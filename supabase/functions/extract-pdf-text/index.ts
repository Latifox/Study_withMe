
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
    
    // Step 2: Extract text from the PDF
    try {
      console.log('Extracting text from PDF')
      
      // Convert file to ArrayBuffer
      const buffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // This is a more robust approach to text extraction
      // We'll extract readable text and clean it up
      let textContent = '';
      
      // Try UTF-8 encoding first
      try {
        const utf8Decoder = new TextDecoder('utf-8');
        // Convert binary data to a string
        const rawText = utf8Decoder.decode(bytes);
        
        // Clean and normalize the text
        textContent = cleanExtractedText(rawText);
      } catch (decodeError) {
        console.error('Error with UTF-8 decoding, trying alternative approach:', decodeError);
        
        // If UTF-8 fails, try to extract text with a more basic approach
        // Look for sequences that appear to be text
        textContent = extractTextFromBinary(bytes);
      }
      
      if (textContent.length < 100) {
        console.warn('Extracted text is suspiciously short, trying alternative extraction method');
        textContent = extractTextFromBinary(bytes);
      }
      
      if (textContent.length === 0) {
        console.warn('No text content extracted from PDF, using placeholder');
        textContent = 'PDF content could not be extracted automatically. Manual processing required.';
      }
      
      // Verify text quality - check if it has a reasonable proportion of readable characters
      const readableCharRatio = countReadableChars(textContent) / textContent.length;
      console.log(`Text readability ratio: ${readableCharRatio}`);
      
      if (readableCharRatio < 0.5) {
        console.warn('Extracted text has low readability, trying another approach');
        const alternativeText = extractTextWithRegex(bytes);
        
        if (alternativeText.length > textContent.length * 0.7) {
          textContent = alternativeText;
        }
      }
      
      console.log(`Text extraction complete. Extracted ${textContent.length} characters`);
      console.log('Sample of extracted text:', textContent.substring(0, 500) + '...');
      
      // Step 3: Determine language of the content
      const detectLanguage = (text: string): string => {
        // Basic detection based on common words
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
        
        console.log(`Language detection: English=${englishCount}, Spanish=${spanishCount}, French=${frenchCount}`);
        
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

// Helper functions for text extraction

function cleanExtractedText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control chars
    .replace(/(\(cid:\d+\)|\[\d+\])/g, '') // Remove CID references
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove more control chars
    .replace(/\\n/g, '\n') // Replace literal "\n" with actual line breaks
    .replace(/\\t/g, '\t') // Replace literal "\t" with actual tabs
    .replace(/\\r/g, '') // Remove carriage returns
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/g, ' ') // Keep only common ASCII and Latin characters
    .trim();
}

function countReadableChars(text: string): number {
  // Count alphanumeric characters and common punctuation
  const readableChars = text.match(/[a-zA-Z0-9.,;:!?\- ]/g);
  return readableChars ? readableChars.length : 0;
}

function extractTextFromBinary(bytes: Uint8Array): string {
  // Look for strings of readable ASCII characters in the binary data
  let result = '';
  let currentString = '';
  
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    // Check if the byte represents a readable ASCII character
    if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
      currentString += String.fromCharCode(byte);
    } else {
      // If we hit a non-readable character, check if we've built up a decent string
      if (currentString.length > 3) { // Require at least 4 consecutive readable chars
        result += currentString + ' ';
      }
      currentString = '';
    }
  }
  
  // Don't forget the last string if we had one
  if (currentString.length > 3) {
    result += currentString;
  }
  
  return cleanExtractedText(result);
}

function extractTextWithRegex(bytes: Uint8Array): string {
  // Another approach: convert to string and use regex to extract
  // sequences that look like text
  
  // First try UTF-8
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  
  // Extract words (3+ consecutive letter/number sequences)
  const wordRegex = /[a-zA-Z0-9][a-zA-Z0-9.,:;\-_' ]{2,}/g;
  const matches = text.match(wordRegex) || [];
  
  return matches.join(' ');
}

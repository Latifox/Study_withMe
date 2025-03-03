
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
    
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    
    console.log('Extracting text from PDF...');
    
    // Custom PDF text extraction approach
    let fullText = await extractTextFromPdf(arrayBuffer);
    console.log(`Extracted ${fullText.length} characters of text`);
    
    if (fullText.length < 100) {
      console.warn('Extracted text is very short, this might indicate extraction issues');
    }
    
    console.log('First 200 characters:', fullText.substring(0, 200));
    
    // Simple language detection
    const detectedLanguage = detectLanguage(fullText);
    
    // Store the extracted text in the database
    console.log('Storing extracted text in database');
    const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures';
    
    const { data: updateData, error: updateError } = await supabase
      .from(tableName)
      .update({ 
        content: fullText,
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
        contentLength: fullText.length,
        language: detectedLanguage,
        textPreview: fullText.substring(0, 200) + '...',
        lectureId: numericLectureId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
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

/**
 * Custom PDF text extraction function that uses multiple strategies
 */
async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const textDecoder = new TextDecoder('utf-8');
    
    // We'll first try to convert the PDF to a string - this isn't perfect
    // but can help us extract text with regex patterns
    const rawText = textDecoder.decode(uint8Array);
    
    // Combined approach using multiple extraction strategies
    let extractedText = '';
    
    // Strategy 1: Extract text between BT (Begin Text) and ET (End Text) markers
    try {
      console.log('Trying BT/ET extraction method...');
      const textMarkers = rawText.match(/BT([\s\S]*?)ET/g) || [];
      console.log(`Found ${textMarkers.length} BT/ET text sections`);
      
      let btExtractedText = '';
      for (const marker of textMarkers) {
        // Look for text patterns like (text) TJ or Tj
        const textMatches = marker.match(/\((.*?)\)([ ]?)(TJ|Tj)/g) || [];
        for (const match of textMatches) {
          // Extract the text between parentheses
          const text = match.match(/\((.*?)\)/);
          if (text && text[1]) {
            btExtractedText += text[1] + ' ';
          }
        }
      }
      
      if (btExtractedText.length > 0) {
        console.log(`BT/ET method extracted ${btExtractedText.length} chars`);
        extractedText += btExtractedText;
      }
    } catch (error) {
      console.error('Error in BT/ET extraction:', error);
    }
    
    // Strategy 2: Look for text objects with Tj, TJ operators directly
    try {
      console.log('Trying direct text operator extraction...');
      const textOperators = rawText.match(/\/(T[idmfj]|TJ|Tm)\s*(\[.*?\]|\(.*?\))/g) || [];
      let opExtractedText = '';
      
      for (const block of textOperators) {
        const text = block.match(/\((.*?)\)/);
        if (text && text[1]) {
          opExtractedText += text[1] + ' ';
        }
      }
      
      if (opExtractedText.length > 0) {
        console.log(`Operator method extracted ${opExtractedText.length} chars`);
        // Only add this text if it provides significant additional content
        if (extractedText.length === 0 || 
            (opExtractedText.length > extractedText.length * 0.2)) {
          extractedText += ' ' + opExtractedText;
        }
      }
    } catch (error) {
      console.error('Error in text operator extraction:', error);
    }
    
    // Strategy 3: Unicode text extraction for PDFs that use Unicode
    try {
      console.log('Trying Unicode extraction...');
      // Look for Unicode sequences often used in PDFs
      const unicodeMatches = rawText.match(/\\u([0-9a-fA-F]{4})/g) || [];
      if (unicodeMatches.length > 0) {
        console.log(`Found ${unicodeMatches.length} Unicode sequences`);
        let unicodeText = '';
        for (const match of unicodeMatches) {
          try {
            const hexValue = match.substring(2); // Remove \u
            const charCode = parseInt(hexValue, 16);
            unicodeText += String.fromCharCode(charCode) + ' ';
          } catch (e) {
            // Skip invalid Unicode
          }
        }
        
        if (unicodeText.length > 0) {
          console.log(`Unicode method extracted ${unicodeText.length} chars`);
          extractedText += ' ' + unicodeText;
        }
      }
    } catch (error) {
      console.error('Error in Unicode extraction:', error);
    }
    
    // Strategy 4: Plain text extraction as a fallback
    if (extractedText.length < 100) {
      console.log('Using plain text extraction as fallback...');
      // Simple regex to find likely text (letters + punctuation + spaces)
      const textBlocks = rawText.match(/[a-zA-Z0-9\s.,;:!?()\-'"\[\]]{10,}/g) || [];
      let plainText = textBlocks.join(' ');
      
      if (plainText.length > 0) {
        console.log(`Plain text fallback extracted ${plainText.length} chars`);
        extractedText += ' ' + plainText;
      }
    }
    
    // Clean up the extracted text
    const cleanedText = extractedText
      .replace(/\s+/g, ' ')          // Replace multiple spaces with a single space
      .replace(/(\r\n|\n|\r)/gm, '\n') // Normalize line breaks
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-ASCII characters except newlines
      .trim();
    
    console.log(`Final extracted text length: ${cleanedText.length} characters`);
    return cleanedText;
  } catch (error) {
    console.error('Error in PDF text extraction:', error);
    // Return any partial text extracted or empty string if complete failure
    return '';
  }
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


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
    
    // Extract text using improved methods
    let extractedText = await extractTextFromPDF(fileData);
    
    if (!extractedText || extractedText.length < 100) {
      console.log("First extraction method yielded limited results, trying alternative method");
      extractedText = await extractTextUsingRawBytes(fileData);
    }
    
    // Clean the extracted text
    extractedText = cleanExtractedText(extractedText);
    
    console.log(`Extracted ${extractedText.length} characters of text`);
    console.log('First 500 characters:', extractedText.substring(0, 500));
    
    // Detect language (basic implementation)
    const detectedLanguage = detectTextLanguage(extractedText);
    
    // Store the extracted text
    console.log('Storing extracted text in database')
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
        contentLength: extractedText.length,
        language: detectedLanguage,
        lectureId: numericLectureId
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

// Main PDF text extraction function
async function extractTextFromPDF(pdfFile: Blob): Promise<string> {
  try {
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Look for text markers in PDF
    // In PDF structure, text is often between "BT" (Begin Text) and "ET" (End Text)
    let textContent = '';
    
    // First try standard UTF-8 decoding
    try {
      const decoder = new TextDecoder('utf-8');
      const rawText = decoder.decode(bytes);
      
      // Extract parts that look like text
      const textPatterns = rawText.match(/[a-zA-Z0-9\s.,;:!?'"()\-–—]{5,}/g) || [];
      textContent = textPatterns.join(' ');
    } catch (e) {
      console.error("UTF-8 decoding failed:", e);
    }
    
    // If we didn't get much text, try more advanced extraction
    if (textContent.length < 200) {
      textContent = extractTextFromPDFBytes(bytes);
    }
    
    return textContent;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return "ERROR: Could not extract text from this PDF.";
  }
}

// Alternative text extraction method using raw byte patterns
async function extractTextUsingRawBytes(pdfFile: Blob): Promise<string> {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Extract all strings between parentheses (PDF often stores text like this)
    const pdfStr = new TextDecoder().decode(bytes);
    const stringMatches = pdfStr.match(/\((.*?)\)/g) || [];
    
    let extractedStrings = stringMatches
      .map(s => s.slice(1, -1)) // Remove the parentheses
      .filter(s => s.length > 3) // Only keep strings of reasonable length
      .join(' ');
    
    // Also try to find text by looking for word boundaries
    const wordMatches = pdfStr.match(/[a-zA-Z]{2,}[a-zA-Z\s.,;:!?'"()]{3,}/g) || [];
    const wordText = wordMatches.join(' ');
    
    // Combine both methods
    return extractedStrings.length > wordText.length ? extractedStrings : wordText;
  } catch (e) {
    console.error("Raw bytes extraction failed:", e);
    return "";
  }
}

// Extract text by analyzing PDF byte patterns
function extractTextFromPDFBytes(bytes: Uint8Array): string {
  let textParts: string[] = [];
  let currentText = '';
  const textStart = [66, 84]; // 'BT' in ASCII
  const textEnd = [69, 84]; // 'ET' in ASCII
  
  // Scan for text blocks between BT and ET markers
  let inTextBlock = false;
  let textBlockContent = '';
  
  for (let i = 0; i < bytes.length - 1; i++) {
    // Check for text block start
    if (!inTextBlock && bytes[i] === textStart[0] && bytes[i + 1] === textStart[1]) {
      inTextBlock = true;
      textBlockContent = '';
      i += 1; // Skip the 'T' in 'BT'
      continue;
    }
    
    // Check for text block end
    if (inTextBlock && bytes[i] === textEnd[0] && bytes[i + 1] === textEnd[1]) {
      inTextBlock = false;
      
      // Try to clean and decode the text block
      const cleanedBlock = textBlockContent
        .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ') // Keep only printable ASCII and extended Latin
        .replace(/\s+/g, ' ');
      
      if (cleanedBlock.trim().length > 0) {
        textParts.push(cleanedBlock);
      }
      
      i += 1; // Skip the 'T' in 'ET'
      continue;
    }
    
    // Collect content within text block
    if (inTextBlock) {
      // Only collect printable ASCII characters
      if (bytes[i] >= 32 && bytes[i] <= 126) {
        textBlockContent += String.fromCharCode(bytes[i]);
      }
    }
    
    // Collect regular text outside of text blocks
    // Look for sequences of readable characters
    if (bytes[i] >= 32 && bytes[i] <= 126) {
      currentText += String.fromCharCode(bytes[i]);
    } else {
      if (currentText.length > 5) { // Only keep sequences of reasonable length
        textParts.push(currentText);
      }
      currentText = '';
    }
  }
  
  // Add any remaining text
  if (currentText.length > 5) {
    textParts.push(currentText);
  }
  
  return textParts.join(' ');
}

// Clean and normalize extracted text
function cleanExtractedText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control chars
    .replace(/(\(cid:\d+\)|\[\d+\])/g, '') // Remove CID references
    .replace(/\\n/g, '\n') // Replace literal "\n" with actual line breaks
    .replace(/\\t/g, '\t') // Replace literal "\t" with actual tabs
    .replace(/\\r/g, '') // Remove carriage returns
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/g, ' ') // Keep only common ASCII and Latin characters
    .trim();
}

// Basic language detection
function detectTextLanguage(text: string): string {
  // Basic detection based on common words
  const normalizedText = text.toLowerCase();
  const languages = [
    { name: 'english', words: ['the', 'and', 'is', 'in', 'it', 'to', 'of', 'that', 'this'], count: 0 },
    { name: 'spanish', words: ['el', 'la', 'es', 'en', 'y', 'de', 'que', 'un', 'una'], count: 0 },
    { name: 'french', words: ['le', 'la', 'est', 'et', 'en', 'de', 'que', 'un', 'une'], count: 0 }
  ];
  
  // Count occurrences of common words for each language
  for (const lang of languages) {
    for (const word of lang.words) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = normalizedText.match(regex);
      if (matches) {
        lang.count += matches.length;
      }
    }
  }
  
  // Return the language with the highest count
  languages.sort((a, b) => b.count - a.count);
  console.log(`Language detection results: ${languages.map(l => `${l.name}=${l.count}`).join(', ')}`);
  
  return languages[0].count > 0 ? languages[0].name : 'english'; // Default to English if no matches
}

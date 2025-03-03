
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
    // Convert Blob to ArrayBuffer and then to Uint8Array for text extraction
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Using a pure text-based approach without PDF.js
    let extractedText = await extractReadableText(bytes);
    console.log(`Extracted ${extractedText.length} characters of text`);
    
    if (extractedText.length < 200) {
      console.log("First extraction method yielded limited results, trying alternative method");
      extractedText = await extractTextFromPdfBytes(bytes);
      console.log(`Alternative method extracted ${extractedText.length} characters`);
    }
    
    // Clean the extracted text to make it readable
    extractedText = cleanExtractedText(extractedText);
    
    console.log(`Final cleaned text: ${extractedText.length} characters`);
    console.log('First 200 characters:', extractedText.substring(0, 200));
    
    // Detect language (basic implementation)
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

// Extract readable text using UTF-8 decoding
async function extractReadableText(bytes: Uint8Array): Promise<string> {
  try {
    // First try a simple UTF-8 decode of the entire file
    const decoder = new TextDecoder('utf-8');
    let fullText = decoder.decode(bytes);
    
    // Extract text that looks human-readable (3+ consecutive letters)
    const textMatches = fullText.match(/[a-zA-Z]{3,}[a-zA-Z\s.,;:!?'"()]{5,}/g) || [];
    const extractedText = textMatches.join(' ');
    
    return extractedText;
  } catch (e) {
    console.error("Error in extractReadableText:", e);
    return "";
  }
}

// Extract text by analyzing PDF byte patterns
function extractTextFromPdfBytes(bytes: Uint8Array): Promise<string> {
  return new Promise((resolve) => {
    try {
      const extractedParts: string[] = [];
      
      // Approach 1: Look for text between parentheses (PDF string objects)
      // Convert bytes to string first
      const pdfString = new TextDecoder('utf-8').decode(bytes);
      const parenthesisRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
      let match;
      
      while ((match = parenthesisRegex.exec(pdfString)) !== null) {
        if (match[1].length > 3) { // Only consider strings of reasonable length
          let extractedText = match[1]
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\\\/g, '\\')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .trim();
          
          if (extractedText.length > 0 && !/^\d+$/.test(extractedText)) {
            extractedParts.push(extractedText);
          }
        }
      }
      
      // Approach 2: Look for text blocks between BT and ET operators
      const btIndex = [];
      const etIndex = [];
      
      // Find all BT and ET positions
      for (let i = 0; i < bytes.length - 1; i++) {
        if (bytes[i] === 66 && bytes[i + 1] === 84) { // 'BT'
          btIndex.push(i);
        } else if (bytes[i] === 69 && bytes[i + 1] === 84) { // 'ET'
          etIndex.push(i);
        }
      }
      
      // Process text blocks
      for (let i = 0; i < Math.min(btIndex.length, etIndex.length); i++) {
        if (etIndex[i] > btIndex[i]) {
          const blockBytes = bytes.slice(btIndex[i] + 2, etIndex[i]);
          const blockText = new TextDecoder('utf-8').decode(blockBytes);
          
          // Extract text objects (Tj, TJ operators)
          const textMatches = blockText.match(/\([^)]+\)[\s]*T[jJ]/g);
          if (textMatches) {
            for (const match of textMatches) {
              let text = match.substring(1, match.lastIndexOf(')'))
                .replace(/\\n/g, ' ')
                .replace(/\\r/g, ' ')
                .replace(/\\\\/g, '\\')
                .replace(/\\\(/g, '(')
                .replace(/\\\)/g, ')')
                .trim();
              
              if (text.length > 0) {
                extractedParts.push(text);
              }
            }
          }
        }
      }
      
      // Approach 3: Scan for ASCII text sequences
      let currentText = '';
      for (let i = 0; i < bytes.length; i++) {
        // Only collect printable ASCII characters
        if (bytes[i] >= 32 && bytes[i] <= 126) {
          currentText += String.fromCharCode(bytes[i]);
        } else {
          if (currentText.length >= 4 && /[a-zA-Z]{2,}/.test(currentText)) {
            extractedParts.push(currentText);
          }
          currentText = '';
        }
      }
      
      // Join all extracted parts and return
      const result = extractedParts.join(' ');
      resolve(result);
    } catch (error) {
      console.error("Error in extractTextFromPdfBytes:", error);
      resolve("");
    }
  });
}

// Clean and normalize extracted text
function cleanExtractedText(text: string): string {
  if (!text) return "";
  
  return text
    // Remove control characters
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    // Remove repeated whitespace
    .replace(/\s+/g, ' ')
    // Remove weird markers
    .replace(/(\(cid:\d+\)|\[\d+\])/g, '')
    // Remove single non-word characters surrounded by spaces
    .replace(/\s[^\w\s]\s/g, ' ')
    // Remove very short "words" that are likely not real words
    .replace(/\s[a-zA-Z]{1,2}\s/g, ' ')
    // Remove strings that are just numbers
    .replace(/\s\d+\s/g, ' ')
    // Replace multiple spaces with a single space
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Basic language detection
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

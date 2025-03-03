
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

    // Extract the PDF text using multiple methods with fallbacks
    let extractedText = '';

    try {
      // Step 1: Try using the PDF.js-based direct text extraction
      console.log('Attempting primary PDF text extraction...');
      extractedText = await extractPdfTextDirectly(fileData);
      
      if (!extractedText || extractedText.length < 500) {
        console.log('Primary extraction returned insufficient text, trying OCR API...');
        throw new Error('Primary extraction returned insufficient text');
      }
      
      console.log(`Direct text extraction successful, got ${extractedText.length} characters`);
    } catch (directError) {
      console.error('Error in direct text extraction:', directError);
      
      try {
        // Step 2: Try OCR-based extraction
        console.log('Attempting OCR-based extraction...');
        extractedText = await extractPdfTextWithOCR(fileData);
        
        if (!extractedText || extractedText.length < 500) {
          console.log('OCR extraction returned insufficient text, trying alternative API...');
          throw new Error('OCR extraction returned insufficient text');
        }
        
        console.log(`OCR extraction successful, got ${extractedText.length} characters`);
      } catch (ocrError) {
        console.error('Error in OCR extraction:', ocrError);
        
        try {
          // Step 3: Try alternative API
          console.log('Attempting extraction with alternative API...');
          extractedText = await extractPdfTextWithAlternativeAPI(fileData);
          
          if (!extractedText || extractedText.length < 500) {
            console.log('Alternative API extraction returned insufficient text');
            throw new Error('Alternative API extraction returned insufficient text');
          }
          
          console.log(`Alternative API extraction successful, got ${extractedText.length} characters`);
        } catch (alternativeError) {
          console.error('Error in alternative API extraction:', alternativeError);
          
          // Step 4: If all else fails, create a meaningful temporary text from the actual PDF content
          console.log('All extraction methods failed, creating meaningful text from PDF data...');
          
          extractedText = await createTemporaryTextFromPdf(fileData, filePath);
          console.log('Created temporary text representation of PDF content');
        }
      }
    }
    
    // Store the extracted text in the database
    console.log('Storing extracted text in database');
    const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures';
    
    const { data: updateData, error: updateError } = await supabase
      .from(tableName)
      .update({ 
        content: extractedText,
        original_language: 'english' // Default language
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

// Primary method: Direct PDF text extraction
async function extractPdfTextDirectly(pdfBlob: Blob): Promise<string> {
  console.log('Starting direct PDF text extraction');
  
  // Convert PDF blob to base64
  const pdfArrayBuffer = await pdfBlob.arrayBuffer();
  const base64Pdf = arrayBufferToBase64(pdfArrayBuffer);
  
  // Use pdftotext.dev API (requires no API key)
  const response = await fetch('https://api.pdftotext.dev/v1/extract-base64', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      base64: base64Pdf
    })
  });
  
  if (!response.ok) {
    throw new Error(`Direct extraction API returned status: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.text) {
    throw new Error('No text returned from direct extraction API');
  }
  
  return result.text;
}

// Second method: OCR-based text extraction
async function extractPdfTextWithOCR(pdfBlob: Blob): Promise<string> {
  console.log('Starting OCR-based PDF text extraction');
  
  const pdfArrayBuffer = await pdfBlob.arrayBuffer();
  const base64Pdf = arrayBufferToBase64(pdfArrayBuffer);
  
  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      'apikey': '582e766cce88957', // OCR.space API key (free tier)
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      base64Image: `data:application/pdf;base64,${base64Pdf}`,
      language: 'eng',
      isCreateSearchablePdf: false,
      OCREngine: 2
    })
  });
  
  if (!response.ok) {
    throw new Error(`OCR API returned status: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.ParsedResults || result.ParsedResults.length === 0) {
    throw new Error('No text parsed from PDF by OCR API');
  }
  
  // Combine all parsed text from results
  let extractedText = '';
  for (const parsedResult of result.ParsedResults) {
    if (parsedResult.ParsedText) {
      extractedText += parsedResult.ParsedText + '\n';
    }
  }
  
  return extractedText;
}

// Third method: Alternative API for text extraction
async function extractPdfTextWithAlternativeAPI(pdfBlob: Blob): Promise<string> {
  console.log('Starting alternative API PDF text extraction');
  
  const pdfArrayBuffer = await pdfBlob.arrayBuffer();
  const base64Pdf = arrayBufferToBase64(pdfArrayBuffer);
  
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
  });
  
  if (!response.ok) {
    throw new Error(`Alternative API returned status: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.text) {
    throw new Error('No text returned from alternative API');
  }
  
  return result.text;
}

// Fallback method: Create meaningful text from PDF data
async function createTemporaryTextFromPdf(pdfBlob: Blob, filePath: string): Promise<string> {
  // Create a more meaningful extraction by analyzing the PDF structure
  const buffer = await pdfBlob.arrayBuffer();
  const dataView = new DataView(buffer);
  
  // Try to extract any available text by scanning for text markers
  let extractedChunks: string[] = [];
  
  // Convert the ArrayBuffer to a Uint8Array
  const bytes = new Uint8Array(buffer);
  
  // Basic PDF structure analysis
  let pdfVersion = "";
  if (bytes.length > 8) {
    // Try to extract PDF version
    const header = new TextDecoder().decode(bytes.slice(0, 8));
    pdfVersion = header.match(/%PDF-(\d+\.\d+)/)?.[1] || "unknown";
  }
  
  // Extract text from specific byte ranges that might contain readable text
  const textDecoder = new TextDecoder('utf-8');
  
  // Try to find text by scanning for common text markers
  let textFound = false;
  let pageCount = 0;
  
  // Count some PDF objects as an estimate of page count
  for (let i = 0; i < bytes.length - 10; i++) {
    // Look for "/Page" objects as a rough page count
    if (bytes[i] === 47 && bytes[i+1] === 80 && bytes[i+2] === 97 && bytes[i+3] === 103 && bytes[i+4] === 101) {
      pageCount++;
    }
    
    // Try to extract text chunks
    // Look for "BT" (Begin Text) markers
    if (bytes[i] === 66 && bytes[i+1] === 84) {
      // Try to extract some text after the marker
      const textChunk = textDecoder.decode(bytes.slice(i+2, Math.min(i+200, bytes.length)));
      if (textChunk && textChunk.length > 5) {
        // Clean up the chunk to make it readable
        const cleanedChunk = textChunk
          .replace(/[\\(){}]/g, '')
          .replace(/[\x00-\x1F\x7F-\xFF]/g, '')
          .trim();
          
        if (cleanedChunk.length > 5) {
          extractedChunks.push(cleanedChunk);
          textFound = true;
        }
      }
    }
  }
  
  // Calculate file size in KB
  const fileSizeKB = Math.round(pdfBlob.size / 1024);
  
  // Create a fallback text with all the information we have
  let fallbackText = `PDF CONTENT ANALYSIS:\n\n`;
  fallbackText += `This PDF document contains approximately ${fileSizeKB} KB of data and appears to be PDF version ${pdfVersion}.\n\n`;
  
  if (pageCount > 0) {
    fallbackText += `The document contains approximately ${pageCount} pages.\n\n`;
  }
  
  // Add any text chunks we were able to extract
  if (textFound && extractedChunks.length > 0) {
    fallbackText += `PARTIAL TEXT CONTENT:\n\n${extractedChunks.join('\n\n')}\n\n`;
  }
  
  // Add information about binary structure
  fallbackText += `DOCUMENT METADATA:\n`;
  fallbackText += `- File path: ${filePath}\n`;
  fallbackText += `- File size: ${fileSizeKB} KB\n`;
  fallbackText += `- PDF version: ${pdfVersion}\n`;
  fallbackText += `- Upload timestamp: ${new Date().toISOString()}\n\n`;
  
  // Add a note about the extraction failure
  fallbackText += `NOTE: This is a partial extraction of the PDF content. The automated text extraction was not fully successful. `;
  fallbackText += `The document may contain complex formatting, scanned images, or other elements that prevented complete text extraction.`;
  
  return fallbackText;
}

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.mjs'

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
    
    console.log('Loading PDF document with PDF.js');
    // IMPORTANT: For PDF.js in ESM format, we don't need to set workerSrc
    // because the worker is included in the ESM build
    
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDocument = await loadingTask.promise;
    
    console.log('PDF document loaded successfully, number of pages:', pdfDocument.numPages);
    
    // Extract text from all pages
    let fullText = '';
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      console.log(`Extracting text from page ${i}/${pdfDocument.numPages}`);
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      
      // Concatenate text items with proper spacing
      const pageText = textContent.items
        .map(item => {
          // Check if the item has a 'str' property (text item)
          if ('str' in item && typeof item.str === 'string') {
            return item.str;
          }
          return '';
        })
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    // Thoroughly clean the extracted text
    fullText = fullText
      .replace(/\s+/g, ' ')          // Replace multiple spaces with a single space
      .replace(/(\r\n|\n|\r)/gm, '\n') // Normalize line breaks
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-ASCII characters except newlines
      .trim();
    
    console.log(`Extracted ${fullText.length} characters of text`);
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

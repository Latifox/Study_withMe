
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
    
    // Use OpenAI to extract and process the PDF content
    try {
      // The PDF data is available now, call OpenAI to extract the text
      console.log('Sending PDF to OpenAI for text extraction...');
      
      // Convert the blob to base64 for sending to OpenAI
      const buffer = await fileData.arrayBuffer();
      const base64Data = arrayBufferToBase64(buffer);
      
      // Get the OpenAI API key from environment variables
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY environment variable not set');
      }
      
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract all the readable text content from this PDF document. Return ONLY the actual text content that a human would read, organized in paragraphs. Do not describe the document or include any metadata. Do not include any notes about the extraction process."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64Data}`
                  }
                }
              ]
            }
          ],
          max_tokens: 4096
        })
      });
      
      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorData}`);
      }
      
      const openaiData = await openaiResponse.json();
      console.log('OpenAI response received');
      
      // Extract the text content from the OpenAI response
      const extractedText = openaiData.choices[0].message.content.trim();
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
    } catch (openaiError) {
      console.error('Error in OpenAI processing:', openaiError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error extracting text with OpenAI: ${openaiError.message}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
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

// Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
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

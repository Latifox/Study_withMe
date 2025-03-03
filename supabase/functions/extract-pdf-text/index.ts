
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { extractTextFromPDF } from "./textProcessor.ts";

// Define CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("PDF extraction function called");
    
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Request data:", JSON.stringify(requestData));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const { filePath, lectureId, isProfessorLecture = false } = requestData;
    
    if (!filePath || !lectureId) {
      console.error("Missing required parameters:", { filePath, lectureId });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: filePath or lectureId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download the PDF from storage
    console.log(`Downloading PDF from path: ${filePath}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('lecture_pdfs')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Error downloading PDF:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download PDF file', details: downloadError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log("PDF download successful, file size:", fileData.size);

    // Extract text from the PDF
    console.log('Extracting text from PDF...');
    let extractedText;
    try {
      extractedText = await extractTextFromPDF(fileData);
    } catch (extractError) {
      console.error('Error during PDF text extraction:', extractError);
      return new Response(
        JSON.stringify({ error: 'Failed to extract text from PDF', details: extractError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!extractedText || extractedText.length === 0) {
      console.error('No text could be extracted from the PDF');
      return new Response(
        JSON.stringify({ error: 'No text could be extracted from the PDF' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Extracted ${extractedText.length} characters from PDF`);

    // Return the extracted content
    return new Response(
      JSON.stringify({ 
        content: extractedText,
        original_length: extractedText.length,
        lecture_id: lectureId,
        is_professor_lecture: isProfessorLecture
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});


import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { extractTextFromPDF } from "./textProcessor.ts";
import { analyzePDFStructure } from "./gptAnalyzer.ts";
import { validateSegments } from "./segmentValidator.ts";

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
    // Parse the request body
    const { filePath, lectureId, isProfessorLecture = false } = await req.json();
    
    if (!filePath || !lectureId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: filePath or lectureId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
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

    // Extract text from the PDF
    console.log('Extracting text from PDF...');
    const extractedText = await extractTextFromPDF(fileData);
    
    if (!extractedText || extractedText.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No text could be extracted from the PDF' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Extracted ${extractedText.length} characters from PDF`);

    // Optional: Analyze PDF structure with GPT to improve parsing
    let enhancedContent = extractedText;
    try {
      console.log('Analyzing PDF structure with GPT...');
      enhancedContent = await analyzePDFStructure(extractedText);
      console.log('PDF structure analysis complete');
    } catch (error) {
      console.error('Error analyzing PDF structure:', error);
      // Continue with the raw extracted text if analysis fails
      console.log('Proceeding with raw extracted text...');
    }

    // Optional: Validate the segments to ensure they meet requirements
    try {
      console.log('Validating content segments...');
      validateSegments(enhancedContent);
      console.log('Content segments validated successfully');
    } catch (error) {
      console.error('Content validation warning:', error);
      // Continue anyway as this is just a quality check
    }

    // Return the extracted and processed content
    return new Response(
      JSON.stringify({ 
        content: enhancedContent,
        original_length: extractedText.length,
        processed_length: enhancedContent.length,
        lecture_id: lectureId,
        is_professor_lecture: isProfessorLecture
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

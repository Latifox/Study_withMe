
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getPdfText } from "./textProcessor.ts";
import { validateContent } from "./segmentValidator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Set up Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  console.log("Request received for extract-pdf-text");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request (CORS preflight)");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`Method not allowed: ${req.method}`);
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      status: 405
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse request body
    const requestData = await req.json();
    console.log("Request body received:", JSON.stringify(requestData));

    // Validate required fields
    const { filePath, lectureId, isProfessorLecture = false } = requestData;
    
    if (!filePath) {
      throw new Error('Missing required field: filePath');
    }
    
    if (!lectureId) {
      throw new Error('Missing required field: lectureId');
    }

    console.log(`Processing PDF file: ${filePath}`);
    console.log(`Lecture ID: ${lectureId}, isProfessorLecture: ${isProfessorLecture}`);

    // Determine the table name based on whether it's a professor lecture
    const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures';
    
    // Download the PDF file from storage
    console.log("Downloading PDF from storage...");
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('lecture_pdfs')
      .download(filePath);

    if (downloadError) {
      console.error("Error downloading PDF:", downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    if (!fileData) {
      throw new Error('No file data received from storage');
    }

    console.log("PDF downloaded successfully, extracting text...");
    
    // Extract text from the PDF
    const pdfText = await getPdfText(fileData);
    console.log(`Extracted text length: ${pdfText.length} characters`);
    
    // Validate the extracted content
    const validatedContent = validateContent(pdfText);
    console.log(`Validated content length: ${validatedContent.length} characters`);

    if (validatedContent.length < 100) {
      throw new Error('Extracted content is too short or invalid');
    }

    // Update the lecture with the extracted content
    console.log(`Updating ${tableName} with extracted content...`);
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ content: validatedContent })
      .eq('id', lectureId);

    if (updateError) {
      console.error("Error updating lecture content:", updateError);
      throw new Error(`Failed to update lecture content: ${updateError.message}`);
    }

    console.log("Lecture content updated successfully");

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: "PDF text extracted and stored successfully",
      content: validatedContent
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in extract-pdf-text:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

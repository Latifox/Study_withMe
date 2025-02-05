import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Buffer } from "https://deno.land/std@0.168.0/node/buffer.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import pdfParse from "npm:pdf-parse@1.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function splitIntoChunks(text: string, wordsPerChunk: number = 150): string[] {
  // Remove extra whitespace and split into words
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    chunks.push(chunk);
  }
  
  return chunks;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to extract PDF text');
    
    // Get the PDF file from the request
    const formData = await req.formData();
    const file = formData.get('file');
    const lectureId = formData.get('lectureId');
    
    if (!file || !(file instanceof File)) {
      throw new Error('No PDF file provided');
    }

    if (!lectureId) {
      throw new Error('No lecture ID provided');
    }

    console.log('Processing PDF file:', file.name);
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('PDF file converted to buffer, size:', buffer.length);

    // Extract text from PDF
    const data = await pdfParse(buffer);
    const text = data.text;
    
    console.log('Successfully extracted text, length:', text.length);

    // Split the text into chunks of approximately 150 words
    const chunks = splitIntoChunks(text);
    console.log(`Split text into ${chunks.length} chunks`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store chunks in the database
    const chunkInsertPromises = chunks.map((content, index) => {
      return supabaseClient
        .from('lecture_chunks')
        .insert({
          lecture_id: parseInt(lectureId as string),
          chunk_order: index + 1,
          content: content
        });
    });

    // Wait for all chunks to be inserted
    await Promise.all(chunkInsertPromises);
    console.log('Successfully stored all chunks in the database');

    // Update the lecture content (keeping the full text as well for other features)
    const { error: lectureError } = await supabaseClient
      .from('lectures')
      .update({ content: text })
      .eq('id', parseInt(lectureId as string));

    if (lectureError) {
      throw lectureError;
    }

    return new Response(
      JSON.stringify({ 
        text,
        numberOfChunks: chunks.length
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error processing PDF:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to extract PDF content',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

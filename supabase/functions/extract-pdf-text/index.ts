
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

async function polishChunk(chunk: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at polishing text chunks. Your task is to:
1. Ensure all sentences are complete
2. Fix any cut-off sentences at the beginning or end
3. Maintain academic tone and technical accuracy
4. Keep the core information intact
5. Return ONLY the polished text, no explanations or markdown`
        },
        {
          role: 'user',
          content: `Polish this text chunk, ensuring all sentences are complete and properly structured: "${chunk}"`
        }
      ],
      temperature: 0.3
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to extract PDF text');
    
    const { filePath, lectureId } = await req.json();
    
    if (!filePath || !lectureId) {
      throw new Error('No file path or lecture ID provided');
    }

    console.log('Processing PDF file:', filePath);
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('lecture_pdfs')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    console.log('PDF file converted to buffer, size:', buffer.length);

    const data = await pdfParse(buffer);
    const text = data.text;
    
    console.log('Successfully extracted text, length:', text.length);

    // Split the text into chunks
    const chunks = splitIntoChunks(text);
    console.log(`Split text into ${chunks.length} chunks`);

    // Polish and store each chunk
    console.log('Starting chunk polishing process...');
    for (let i = 0; i < chunks.length; i++) {
      const polishedContent = await polishChunk(chunks[i]);
      console.log(`Polished chunk ${i + 1}/${chunks.length}`);

      // Store original and polished chunks
      const { error: chunkError } = await supabaseClient
        .from('lecture_chunks')
        .insert({
          lecture_id: parseInt(lectureId),
          chunk_order: i + 1,
          content: chunks[i]
        });

      if (chunkError) {
        throw chunkError;
      }

      const { error: polishedChunkError } = await supabaseClient
        .from('lecture_polished_chunks')
        .insert({
          lecture_id: parseInt(lectureId),
          chunk_order: i + 1,
          original_content: chunks[i],
          polished_content: polishedContent
        });

      if (polishedChunkError) {
        throw polishedChunkError;
      }
    }

    // Update the lecture content (keeping the full text as well for other features)
    const { error: lectureError } = await supabaseClient
      .from('lectures')
      .update({ content: text })
      .eq('id', parseInt(lectureId));

    if (lectureError) {
      throw lectureError;
    }

    console.log('Successfully stored all chunks and polished chunks in the database');

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

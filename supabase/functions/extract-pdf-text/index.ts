
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Buffer } from "https://deno.land/std@0.168.0/node/buffer.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import pdfParse from "npm:pdf-parse@1.1.1";
import { normalizeText } from './textProcessor.ts';
import { analyzeTextWithGPT } from './gptAnalyzer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('lecture_pdfs')
      .download(filePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    // Extract text from PDF
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const data = await pdfParse(buffer);
    const normalizedText = normalizeText(data.text);
    
    console.log('Successfully extracted and normalized text, length:', normalizedText.length);

    // Update lecture content
    const { error: lectureError } = await supabaseClient
      .from('lectures')
      .update({ content: normalizedText })
      .eq('id', parseInt(lectureId));

    if (lectureError) {
      console.error('Error updating lecture:', lectureError);
      throw lectureError;
    }

    try {
      // Get segments with titles and content from GPT
      const { segments } = await analyzeTextWithGPT(normalizedText);
      console.log('GPT Analysis complete, segments:', segments.length);
      
      // Store segments
      for (let i = 0; i < segments.length; i++) {
        const segmentNumber = i + 1;
        const segment = segments[i];
        
        // Store in lecture_segments table
        const { error: segmentError } = await supabaseClient
          .from('lecture_segments')
          .insert({
            lecture_id: parseInt(lectureId),
            sequence_number: segmentNumber,
            title: segment.title
          });

        if (segmentError) {
          console.error(`Error storing lecture segment ${segmentNumber}:`, segmentError);
          throw segmentError;
        }

        // Store in segments table with content
        const { error: contentError } = await supabaseClient
          .from('segments')
          .insert({
            lecture_id: parseInt(lectureId),
            sequence_number: segmentNumber,
            title: segment.title,
            content: segment.content
          });

        if (contentError) {
          console.error(`Error storing segment content ${segmentNumber}:`, contentError);
          throw contentError;
        }
      }

      console.log('Successfully stored all segments and content');

      return new Response(
        JSON.stringify({ 
          success: true,
          segmentCount: segments.length
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );

    } catch (error) {
      console.error('Error processing content:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error processing PDF:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to extract PDF content',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

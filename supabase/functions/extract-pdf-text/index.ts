
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Buffer } from "https://deno.land/std@0.168.0/node/buffer.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import pdfParse from "npm:pdf-parse@1.1.1";
import { normalizeText, splitIntoSegments } from './textProcessor.ts';
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

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const data = await pdfParse(buffer);
    const normalizedText = normalizeText(data.text);
    
    console.log('Successfully extracted and normalized text, length:', normalizedText.length);

    // Split text into segments
    const { segments } = splitIntoSegments(normalizedText);
    console.log(`Split text into ${segments.length} segments`);

    // Get titles from GPT
    const gptResponse = await analyzeTextWithGPT(normalizedText);
    const titles = gptResponse.titles || new Array(segments.length).fill('Untitled Section');

    // Store segments and their content
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      try {
        // Store segment definition
        const { data: segmentData, error: segmentError } = await supabaseClient
          .from('lecture_segments')
          .insert({
            lecture_id: parseInt(lectureId),
            segment_number: i + 1,
            title: titles[i] || `Section ${i + 1}`,
            start_word: segment.wordStart,
            end_word: segment.wordEnd
          })
          .select()
          .single();

        if (segmentError) {
          console.error('Error storing segment:', segmentError);
          throw segmentError;
        }

        // Store segment content
        const { error: contentError } = await supabaseClient
          .from('lecture_segment_content')
          .insert({
            segment_id: segmentData.id,
            content: segment.content
          });

        if (contentError) {
          console.error('Error storing segment content:', contentError);
          throw contentError;
        }

        console.log(`Successfully stored segment ${i + 1}`);
      } catch (error) {
        console.error(`Error processing segment ${i + 1}:`, error);
        throw error;
      }
    }

    // Update the lecture content
    const { error: lectureError } = await supabaseClient
      .from('lectures')
      .update({ content: normalizedText })
      .eq('id', parseInt(lectureId));

    if (lectureError) {
      console.error('Error updating lecture:', lectureError);
      throw lectureError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        segmentsCount: segments.length
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

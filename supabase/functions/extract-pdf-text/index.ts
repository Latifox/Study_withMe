
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Buffer } from "https://deno.land/std@0.168.0/node/buffer.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import pdfParse from "npm:pdf-parse@1.1.1";
import { normalizeText, getWordsInRange } from './textProcessor.ts';
import { validateSegmentBoundaries } from './segmentValidator.ts';
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

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('lecture_pdfs')
      .download(filePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    console.log('PDF file converted to buffer, size:', buffer.length);

    const data = await pdfParse(buffer);
    const normalizedText = normalizeText(data.text);
    
    console.log('Successfully extracted and normalized text, length:', normalizedText.length);
    console.log('First 200 characters:', normalizedText.substring(0, 200));

    // Analyze text with GPT to get segments
    console.log('Analyzing text with GPT...');
    const gptResponse = await analyzeTextWithGPT(normalizedText);
    console.log('GPT Response:', gptResponse);
    
    if (!gptResponse.segments || !Array.isArray(gptResponse.segments)) {
      throw new Error('Invalid GPT response format - missing segments array');
    }

    const { segments } = gptResponse;
    console.log(`Identified ${segments.length} segments`);

    // Validate segment boundaries
    console.log('Validating segment boundaries...');
    if (!validateSegmentBoundaries(normalizedText, segments)) {
      throw new Error('Invalid segment boundaries detected - segments must align with complete sentences');
    }

    // Store segments and their content
    for (const segment of segments) {
      try {
        // Store segment definition
        const { data: segmentData, error: segmentError } = await supabaseClient
          .from('lecture_segments')
          .insert({
            lecture_id: parseInt(lectureId),
            segment_number: segment.segment_number,
            title: segment.title,
            start_word: segment.start_word,
            end_word: segment.end_word
          })
          .select()
          .single();

        if (segmentError) {
          console.error('Error storing segment:', segmentError);
          throw segmentError;
        }

        // Get content for this segment
        const segmentContent = getWordsInRange(normalizedText, segment.start_word, segment.end_word);

        // Store segment content
        const { error: contentError } = await supabaseClient
          .from('lecture_segment_content')
          .insert({
            segment_id: segmentData.id,
            content: segmentContent
          });

        if (contentError) {
          console.error('Error storing segment content:', contentError);
          throw contentError;
        }

        console.log(`Successfully stored segment ${segment.segment_number}`);
      } catch (error) {
        console.error(`Error processing segment ${segment.segment_number}:`, error);
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

    console.log('Successfully processed all segments');

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

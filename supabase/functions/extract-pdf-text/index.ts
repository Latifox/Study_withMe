
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

    // Create story structure entry
    const { data: storyStructure, error: storyError } = await supabaseClient
      .from('story_structures')
      .insert({
        lecture_id: parseInt(lectureId),
        status: 'processing'
      })
      .select()
      .single();

    if (storyError) {
      console.error('Error creating story structure:', storyError);
      throw storyError;
    }

    // Update lecture content
    const { error: lectureError } = await supabaseClient
      .from('lectures')
      .update({ content: normalizedText })
      .eq('id', parseInt(lectureId));

    if (lectureError) {
      console.error('Error updating lecture:', lectureError);
      throw lectureError;
    }

    // Start asynchronous content generation
    EdgeRuntime.waitUntil((async () => {
      try {
        // Get titles and segment count from GPT
        const gptResponse = await analyzeTextWithGPT(normalizedText);
        console.log('GPT Analysis complete:', gptResponse);
        
        // Calculate content per segment (divide text equally among segments)
        const segmentLength = Math.floor(normalizedText.length / gptResponse.titles.length);
        
        // Store lecture segments with content
        for (let i = 0; i < gptResponse.titles.length; i++) {
          const startIdx = i * segmentLength;
          const endIdx = i === gptResponse.titles.length - 1 
            ? normalizedText.length 
            : (i + 1) * segmentLength;
          
          const segmentContent = normalizedText.slice(startIdx, endIdx);
          
          // Store in lecture_segments for backward compatibility
          const { error: segmentError } = await supabaseClient
            .from('lecture_segments')
            .insert({
              lecture_id: parseInt(lectureId),
              segment_number: i + 1,
              title: gptResponse.titles[i]
            });

          if (segmentError) {
            console.error(`Error storing lecture segment ${i + 1}:`, segmentError);
            throw segmentError;
          }

          // Store in new segments table with content
          const { error: newSegmentError } = await supabaseClient
            .from('segments')
            .insert({
              lecture_id: parseInt(lectureId),
              sequence_number: i + 1,
              title: gptResponse.titles[i],
              content: {
                text: segmentContent,
                slides: [],
                questions: []
              }
            });

          if (newSegmentError) {
            console.error(`Error storing new segment ${i + 1}:`, newSegmentError);
            throw newSegmentError;
          }
        }

        // Update story structure status to completed
        const { error: updateError } = await supabaseClient
          .from('story_structures')
          .update({ status: 'completed' })
          .eq('id', storyStructure.id);

        if (updateError) {
          console.error('Error updating story structure status:', updateError);
          throw updateError;
        }

        console.log('Content generation completed successfully');
      } catch (error) {
        console.error('Error in background processing:', error);
        await supabaseClient
          .from('story_structures')
          .update({ 
            status: 'failed',
            error_message: error.message
          })
          .eq('id', storyStructure.id);
      }
    })());

    return new Response(
      JSON.stringify({ 
        success: true,
        text: normalizedText
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


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Buffer } from "https://deno.land/std@0.168.0/node/buffer.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import pdfParse from "npm:pdf-parse@1.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function analyzeTextWithGPT(text: string): Promise<any> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing academic text and identifying key segments. Important rules:
1. ALWAYS ensure segment boundaries align with complete sentences - never cut a sentence in half
2. Each segment should cover complete ideas or concepts
3. Begin segments at the start of a sentence
4. End segments at the end of a sentence

For the given text:
1. Identify 8-10 key segments
2. For each segment, provide:
   - A clear, descriptive title
   - The starting word number (must be at start of a sentence)
   - The ending word number (must be at end of a sentence)

Output format should be a JSON array of objects with properties:
{
  segment_number: number,
  title: string,
  start_word: number,
  end_word: number
}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Error in analyzeTextWithGPT:', error);
    throw error;
  }
}

function getWordsInRange(text: string, start: number, end: number): string {
  const words = text.split(/\s+/);
  return words.slice(start - 1, end).join(' ');
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
    const text = data.text;
    
    console.log('Successfully extracted text, length:', text.length);

    // Analyze text with GPT to get segments
    console.log('Analyzing text with GPT...');
    const { segments } = await analyzeTextWithGPT(text);
    
    console.log(`Identified ${segments.length} segments`);

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
        const segmentContent = getWordsInRange(text, segment.start_word, segment.end_word);

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
      .update({ content: text })
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


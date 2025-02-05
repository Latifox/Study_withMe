
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
            content: `You are an expert at analyzing academic text and identifying key segments. 
You MUST follow these rules PRECISELY:

1. Each segment MUST start with a COMPLETE sentence that begins with a capital letter
2. Each segment MUST end with a COMPLETE sentence ending with a period, exclamation mark, or question mark
3. NEVER break a sentence in half - always include full sentences
4. Each segment should contain multiple complete sentences covering one main topic
5. Segment boundaries must align perfectly with sentence boundaries
6. The first word of each segment must be the first word of a complete sentence
7. The last word of each segment must be the last word of a complete sentence

For the given text:
1. Split it into 8-10 logical segments following the rules above
2. For each segment provide:
   - A clear title describing the main topic
   - The starting word number (must be first word of a complete sentence)
   - The ending word number (must be last word of a complete sentence)
   - Verify that both start and end align with sentence boundaries

Return ONLY a JSON object in this format:
{
  "segments": [
    {
      "segment_number": number,
      "title": string,
      "start_word": number,
      "end_word": number
    }
  ]
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

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/[\r\n]+/g, ' ')  // Replace newlines with space
    .replace(/\t+/g, ' ')  // Replace tabs with space
    .trim();  // Remove leading/trailing spaces
}

function getWordsInRange(text: string, start: number, end: number): string {
  const words = text.split(/\s+/);
  if (start < 1 || end > words.length || start > end) {
    console.error('Invalid word range:', { start, end, totalWords: words.length });
    throw new Error(`Invalid word range: start=${start}, end=${end}, total words=${words.length}`);
  }
  return words.slice(start - 1, end).join(' ');
}

function isCompleteSentence(text: string): boolean {
  // Check if text starts with a capital letter and ends with proper punctuation
  return /^[A-Z].*[.!?]$/.test(text.trim());
}

function validateSegmentBoundaries(text: string, segments: any[]): boolean {
  const words = text.split(/\s+/);
  console.log('Total words in text:', words.length);
  
  let previousEndWord = 0;
  
  for (const segment of segments) {
    console.log(`Validating segment ${segment.segment_number}:`, {
      start: segment.start_word,
      end: segment.end_word,
      title: segment.title
    });

    // Check for gaps or overlaps between segments
    if (segment.start_word !== previousEndWord + 1 && previousEndWord !== 0) {
      console.error(`Gap or overlap detected between segments at word ${segment.start_word}`);
      return false;
    }

    try {
      const segmentContent = getWordsInRange(text, segment.start_word, segment.end_word);
      console.log(`Segment ${segment.segment_number} content:`, segmentContent.substring(0, 100) + '...');

      // Enhanced validation for complete sentences
      if (!isCompleteSentence(segmentContent)) {
        console.error(`Segment ${segment.segment_number} is not a complete sentence:`, segmentContent);
        return false;
      }

      // Check for sentence-like structure with multiple sentences
      const sentences = segmentContent.match(/[^.!?]+[.!?]+/g);
      if (!sentences || sentences.length < 1) {
        console.error(`Segment ${segment.segment_number} doesn't contain proper sentences:`, segmentContent);
        return false;
      }

      // Validate first and last sentences specifically
      const firstSentence = sentences[0].trim();
      const lastSentence = sentences[sentences.length - 1].trim();

      if (!isCompleteSentence(firstSentence)) {
        console.error(`First sentence of segment ${segment.segment_number} is invalid:`, firstSentence);
        return false;
      }

      if (!isCompleteSentence(lastSentence)) {
        console.error(`Last sentence of segment ${segment.segment_number} is invalid:`, lastSentence);
        return false;
      }

      previousEndWord = segment.end_word;
    } catch (error) {
      console.error(`Error validating segment ${segment.segment_number}:`, error);
      return false;
    }
  }

  return true;
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

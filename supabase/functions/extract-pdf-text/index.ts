import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as pdfjs from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing PDF file:', file.name);

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    // Extract text from all pages
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => 'str' in item ? item.str : '')
        .join(' ');
      fullText += pageText + '\n\n';
    }

    // Clean and preprocess the text
    const cleanedText = fullText
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n')  // Remove excessive newlines
      .trim();

    // Split text into chunks if it's too long (8000 tokens ≈ 32000 characters)
    const MAX_CHUNK_SIZE = 32000;
    const textChunks = [];
    
    if (cleanedText.length > MAX_CHUNK_SIZE) {
      for (let i = 0; i < cleanedText.length; i += MAX_CHUNK_SIZE) {
        textChunks.push(cleanedText.slice(i, i + MAX_CHUNK_SIZE));
      }
    } else {
      textChunks.push(cleanedText);
    }

    console.log(`Extracted ${textChunks.length} chunks of text from PDF`);

    // Process each chunk with OpenAI to ensure proper formatting
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    let processedText = '';

    for (const chunk of textChunks) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a text processor. Clean and format the provided text while preserving its meaning and structure. Remove any artifacts or formatting issues.'
            },
            {
              role: 'user',
              content: chunk
            }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error:', response.status);
        const errorText = await response.text();
        console.error('OpenAI API error details:', errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      processedText += data.choices[0].message.content + '\n';
    }

    console.log('Successfully processed PDF text');

    return new Response(
      JSON.stringify({ text: processedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
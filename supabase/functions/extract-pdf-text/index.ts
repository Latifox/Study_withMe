import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      throw new Error('No file provided');
    }

    // Convert the file to text using GPT-4's vision capabilities
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that reads PDF documents and extracts their textual content accurately. Please read the PDF and provide its content in a clear, structured format. Include all text content, maintaining paragraphs and sections."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please read this PDF document and extract all the text content from it. Maintain the structure and formatting as much as possible. Return the content in a clear, readable format."
              },
              {
                type: "image_url",
                image_url: {
                  url: await file.text(),
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0].message.content;

    // Process the text to ensure it's properly formatted
    const processedContent = {
      fullText: extractedText,
      sections: extractedText.split('\n\n').filter(Boolean), // Split into paragraphs
      metadata: {
        extractedAt: new Date().toISOString(),
        processingMethod: 'gpt-4-vision',
      }
    };

    return new Response(
      JSON.stringify({ text: JSON.stringify(processedContent) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
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
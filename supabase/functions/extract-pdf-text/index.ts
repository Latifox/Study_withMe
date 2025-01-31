import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { PDFDocument } from 'https://cdn.skypack.dev/pdf-lib'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { pdfUrl } = await req.json()

    // Download the PDF file
    const pdfResponse = await fetch(pdfUrl)
    const pdfArrayBuffer = await pdfResponse.arrayBuffer()

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer)
    const pages = pdfDoc.getPages()

    // Extract text from all pages
    let fullText = ''
    for (const page of pages) {
      const text = await page.getText()
      fullText += text + '\n'
    }

    return new Response(
      JSON.stringify({ text: fullText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error extracting PDF text:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
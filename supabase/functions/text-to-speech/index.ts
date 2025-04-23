import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    console.log("Function started");
    
    // Get the request body
    const requestBody = await req.text();
    console.log(`Request body length: ${requestBody.length}`);
    
    let body;
    try {
      body = JSON.parse(requestBody);
      console.log(`Parsed JSON successfully`);
    } catch (e) {
      console.error(`Failed to parse JSON: ${e.message}`);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body",
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { text, voiceId } = body;
    console.log(`Received text of length: ${text?.length || 0} characters`);
    console.log(`Using voice ID: ${voiceId || 'default'}`);
    
    if (!text || text.trim() === '') {
      console.error("Empty text input");
      return new Response(JSON.stringify({ 
        error: "Text is required and cannot be empty",
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Default voice ID (using ElevenLabs voice ID)
    const defaultVoiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah
    
    // Choose which voice to use
    const selectedVoiceId = voiceId || defaultVoiceId;
    console.log(`Selected voice ID: ${selectedVoiceId}`);
    
    try {
      const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
      console.log(`API key retrieved: ${apiKey ? 'Yes' : 'No'}`);
      
      if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY environment variable is not set');
      }
      
      // Ensure text is not too long
      const MAX_TEXT_LENGTH = 5000;
      let processedText = text;
      if (text.length > MAX_TEXT_LENGTH) {
        console.warn(`Text length exceeds maximum (${text.length} > ${MAX_TEXT_LENGTH}), truncating`);
        processedText = text.substring(0, MAX_TEXT_LENGTH) + "...";
      }
      
      console.log(`Making request to ElevenLabs API with voice ID: ${selectedVoiceId}`);
      console.log(`Text length after processing: ${processedText.length}`);
      
      // Making a request to ElevenLabs API
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: processedText,
          model_id: "eleven_multilingual_v2", // Use multilingual v2 for better quality
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
          }
        }),
      });
      
      console.log(`ElevenLabs API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ElevenLabs API error (${response.status}):`, errorText);
        throw new Error(`Failed to convert text to speech: ${response.status} - ${errorText}`);
      }
      
      // Get the audio as array buffer
      const audioArrayBuffer = await response.arrayBuffer();
      console.log(`Audio buffer size: ${audioArrayBuffer.byteLength} bytes`);
      
      if (audioArrayBuffer.byteLength === 0) {
        throw new Error('Received empty audio buffer from ElevenLabs API');
      }
      
      // Convert to base64 in a safe way
      const base64Audio = await arrayBufferToBase64(audioArrayBuffer);
      console.log(`Base64 audio length: ${base64Audio.length}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        audioContent: base64Audio
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error(`Error processing TTS request: ${error.message}`);
      return new Response(JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error(`Unhandled error in text-to-speech function: ${error.message}`);
    console.error(error.stack);
    return new Response(JSON.stringify({ 
      error: `Unhandled error: ${error.message}`,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Safely convert ArrayBuffer to base64 string
async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 1024;
  
  try {
    // Process in chunks to avoid stack overflow
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    
    return btoa(binary);
  } catch (error) {
    console.error(`Error in base64 conversion: ${error.message}`);
    
    // Try alternative approach using TextEncoder/Decoder
    try {
      // Convert to Base64 using TextEncoder/Decoder with fewer operations
      const base64 = Buffer.from(buffer).toString('base64');
      console.log("Used Buffer-based base64 encoding");
      return base64;
    } catch (bufferError) {
      console.error(`Buffer approach failed too: ${bufferError.message}`);
      throw new Error(`Failed to encode audio: ${error.message}`);
    }
  }
}

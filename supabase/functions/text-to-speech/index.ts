
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
    const { text, voiceId } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }
    
    // Default voice IDs for each role (using ElevenLabs voice IDs)
    const defaultVoiceId = voiceId || "EXAVITQu4vr4xnSDxMaL"; // Sarah's voice ID by default
    
    console.log(`Converting text to speech with voice ID: ${defaultVoiceId}`);
    console.log(`Text length: ${text.length} characters`);
    
    // Check if text is too long and needs to be chunked
    const MAX_TEXT_LENGTH = 5000; // Setting a safer limit
    
    if (text.length > MAX_TEXT_LENGTH) {
      console.log(`Text exceeds maximum length, chunking into smaller parts`);
      // Return an error for now - this should be handled on the client side
      throw new Error(`Text too long (${text.length} characters). Maximum allowed is ${MAX_TEXT_LENGTH} characters.`);
    }
    
    // Send request to ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${defaultVoiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error('Failed to convert text to speech');
    }

    // Get the audio as array buffer
    const audioArrayBuffer = await response.arrayBuffer();
    
    // Memory-efficient conversion to base64
    // Use a more efficient method to convert large binary data to base64
    let base64Audio = "";
    
    try {
      // More memory-efficient approach
      const bytes = new Uint8Array(audioArrayBuffer);
      const binString = Array.from(bytes)
        .map(byte => String.fromCharCode(byte))
        .join('');
      base64Audio = btoa(binString);
      
      console.log('Successfully converted text to speech');
    } catch (conversionError) {
      console.error('Error converting audio to base64:', conversionError);
      throw new Error('Failed to process audio data');
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      audioContent: base64Audio,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

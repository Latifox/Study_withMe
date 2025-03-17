
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
    
    // Convert to base64 for easy passing over JSON
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
    
    console.log('Successfully converted text to speech');
    
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

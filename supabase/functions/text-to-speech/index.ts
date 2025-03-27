
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
    const hostVoiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah (female host)
    const guestVoiceId = "TxGEqnHWrfWFTfGW9XjX"; // Josh (male guest expert)
    
    // Process text to separate host and guest parts
    const paragraphs = text.split('\n\n').filter(p => p.trim() !== '');
    
    if (paragraphs.length === 0) {
      throw new Error('No valid text content found');
    }
    
    // Determine which paragraphs belong to host vs guest
    // First paragraph is always the host, then they alternate
    let hostText = '';
    let guestText = '';
    
    paragraphs.forEach((paragraph, index) => {
      if (index % 2 === 0) {
        // Host paragraphs (0, 2, 4, ...)
        hostText += paragraph + '\n\n';
      } else {
        // Guest paragraphs (1, 3, 5, ...)
        guestText += paragraph + '\n\n';
      }
    });
    
    console.log(`Processed script into ${hostText.length} host characters and ${guestText.length} guest characters`);
    
    // Check if text is too long and needs to be chunked
    const MAX_TEXT_LENGTH = 6000; // Increased from 5000 to 6000
    
    if (hostText.length > MAX_TEXT_LENGTH || guestText.length > MAX_TEXT_LENGTH) {
      console.log(`Text exceeds maximum length, chunking into smaller parts`);
      // Return an error for now - this should be handled on the client side
      throw new Error(`Text too long. Maximum allowed is ${MAX_TEXT_LENGTH} characters per voice.`);
    }
    
    // Make parallel requests to ElevenLabs API for host and guest voices
    const [hostResponse, guestResponse] = await Promise.all([
      // Only make the request if there's text for that role
      hostText.trim() ? 
        fetch(`https://api.elevenlabs.io/v1/text-to-speech/${hostVoiceId}/stream`, {
          method: 'POST',
          headers: {
            'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: hostText,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            }
          }),
        }) : 
        Promise.resolve(null),
        
      guestText.trim() ? 
        fetch(`https://api.elevenlabs.io/v1/text-to-speech/${guestVoiceId}/stream`, {
          method: 'POST',
          headers: {
            'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: guestText,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            }
          }),
        }) : 
        Promise.resolve(null),
    ]);

    // Check responses
    if ((hostText.trim() && !hostResponse?.ok) || (guestText.trim() && !guestResponse?.ok)) {
      const errorTextHost = hostResponse ? await hostResponse.text() : '';
      const errorTextGuest = guestResponse ? await guestResponse.text() : '';
      console.error('ElevenLabs API error:', errorTextHost || errorTextGuest);
      throw new Error('Failed to convert text to speech');
    }

    // Get the audio as array buffers
    const hostAudioArrayBuffer = hostResponse ? await hostResponse.arrayBuffer() : null;
    const guestAudioArrayBuffer = guestResponse ? await guestResponse.arrayBuffer() : null;
    
    // Convert to base64
    const hostBase64Audio = hostAudioArrayBuffer ? btoa(
      Array.from(new Uint8Array(hostAudioArrayBuffer))
        .map(byte => String.fromCharCode(byte))
        .join('')
    ) : '';
    
    const guestBase64Audio = guestAudioArrayBuffer ? btoa(
      Array.from(new Uint8Array(guestAudioArrayBuffer))
        .map(byte => String.fromCharCode(byte))
        .join('')
    ) : '';
    
    console.log('Successfully converted text to speech for multiple voices');
    
    return new Response(JSON.stringify({ 
      success: true, 
      hostAudio: hostBase64Audio,
      guestAudio: guestBase64Audio,
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


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('elevenlabs-podcast function called');

  try {
    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody));
    
    const { script, hostVoiceId, guestVoiceId } = requestBody;
    
    if (!script) {
      console.error('Missing required parameter: script');
      throw new Error('Script is required');
    }
    
    // Default voice IDs for each role (using ElevenLabs voice IDs)
    const defaultHostVoiceId = hostVoiceId || "pFZP5JQG7iQjIQuC4Bku"; // Lily
    const defaultGuestVoiceId = guestVoiceId || "onwK4e9ZLuTAKqWW03F9"; // Daniel
    
    console.log(`Creating podcast with Host Voice ID: ${defaultHostVoiceId} and Guest Voice ID: ${defaultGuestVoiceId}`);
    console.log(`Script length: ${script.length} characters`);
    
    // Check for API key
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      console.error('ELEVENLABS_API_KEY environment variable is not set');
      throw new Error('ElevenLabs API key is missing');
    }
    
    console.log('Sending request to ElevenLabs Studio API');
    // Send request to ElevenLabs Studio API
    const response = await fetch("https://api.elevenlabs.io/v1/studio/projects/podcast", {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_id: "21m00Tcm4TlvDq8ikWAM", // Standard podcast model
        mode: {
          type: "conversation",
          conversation: {
            host_voice_id: defaultHostVoiceId,
            guest_voice_id: defaultGuestVoiceId
          }
        },
        source: {
          text: script
        }
      }),
    });

    console.log('ElevenLabs API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`Failed to create podcast: ${response.status} ${errorText}`);
    }

    // Get the response data
    const podcastData = await response.json();
    
    console.log('Successfully created podcast with ElevenLabs:', JSON.stringify(podcastData));
    
    return new Response(JSON.stringify({ 
      success: true, 
      podcastData: podcastData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in elevenlabs-podcast function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

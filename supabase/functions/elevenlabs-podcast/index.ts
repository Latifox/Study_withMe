
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script, hostVoiceId, guestVoiceId } = await req.json();
    
    if (!script) {
      throw new Error('Script is required');
    }
    
    // Default voice IDs for each role (using ElevenLabs voice IDs)
    const defaultHostVoiceId = hostVoiceId || "pFZP5JQG7iQjIQuC4Bku"; // Lily
    const defaultGuestVoiceId = guestVoiceId || "onwK4e9ZLuTAKqWW03F9"; // Daniel
    
    console.log(`Creating podcast with Host Voice ID: ${defaultHostVoiceId} and Guest Voice ID: ${defaultGuestVoiceId}`);
    console.log(`Script length: ${script.length} characters`);
    
    // Send request to ElevenLabs Studio API
    const response = await fetch("https://api.elevenlabs.io/v1/studio/projects/podcast", {
      method: 'POST',
      headers: {
        'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') || '',
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error('Failed to create podcast');
    }

    // Get the response data
    const podcastData = await response.json();
    
    console.log('Successfully created podcast with ElevenLabs');
    
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

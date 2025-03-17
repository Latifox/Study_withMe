
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('wondercraft-podcast function called');

  try {
    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody));
    
    const { script, hostVoiceId, guestVoiceId } = requestBody;
    
    if (!script) {
      console.error('Missing required parameter: script');
      throw new Error('Script is required');
    }
    
    console.log(`Creating podcast with Host Voice ID: ${hostVoiceId} and Guest Voice ID: ${guestVoiceId}`);
    console.log(`Script length: ${script.length} characters`);
    
    // Check for API key
    const apiKey = Deno.env.get('WONDERCRAFT_API_KEY');
    if (!apiKey) {
      console.error('WONDERCRAFT_API_KEY environment variable is not set');
      throw new Error('Wondercraft API key is missing');
    }
    
    // Format script for Wondercraft
    // Parse the script to separate by HOST: and GUEST: prefixes
    const scriptLines = script.split('\n');
    const formattedScript = [];
    
    console.log('Formatting script for Wondercraft API...');
    
    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i].trim();
      if (line.startsWith('HOST:')) {
        formattedScript.push({
          text: line.substring(5).trim(),
          voice_id: hostVoiceId
        });
      } else if (line.startsWith('GUEST:')) {
        formattedScript.push({
          text: line.substring(6).trim(),
          voice_id: guestVoiceId
        });
      }
    }
    
    console.log(`Formatted script with ${formattedScript.length} segments`);
    
    if (formattedScript.length === 0) {
      console.error('No valid script segments were found');
      throw new Error('Script format is invalid, no HOST: or GUEST: prefixes found');
    }
    
    // Create request body for Wondercraft
    const wondercraftBody = {
      script: formattedScript,
      // Default music settings
      music_spec: {
        music_id: "ambient", // A default music ID
        fade_in_ms: 1000,
        fade_out_ms: 1000,
        playback_start: 0,
        playback_end: null, // Let Wondercraft determine the end automatically
        volume: 0.05
      }
    };
    
    console.log('Sending request to Wondercraft API:', JSON.stringify(wondercraftBody));
    
    // Send request to Wondercraft API
    const response = await fetch("https://api.wondercraft.ai/v1/podcast/scripted", {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wondercraftBody),
    });

    console.log('Wondercraft API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Wondercraft API error:', errorText);
      throw new Error(`Failed to create podcast: ${response.status} ${errorText}`);
    }

    // Get the response data
    const podcastData = await response.json();
    
    console.log('Successfully created podcast with Wondercraft:', JSON.stringify(podcastData));
    
    return new Response(JSON.stringify({ 
      success: true, 
      podcastData: podcastData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in wondercraft-podcast function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

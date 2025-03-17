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
    
    const { script, jobId } = requestBody;
    // Use the new custom voice IDs with fallbacks to the previous ones
    const hostVoiceId = requestBody.hostVoiceId || "1da32dae-a953-4e5f-81df-94e4bb1965e5"; 
    const guestVoiceId = requestBody.guestVoiceId || "0b356f1c-03d6-4e80-9427-9e26e7e2d97a"; 
    // Use the specific music ID provided
    const musicId = requestBody.musicId || "168bab40-3ead-4699-80a4-c97a7d613e3e";
    
    // Check for API key
    const apiKey = Deno.env.get('WONDERCRAFT_API_KEY');
    if (!apiKey) {
      console.error('WONDERCRAFT_API_KEY environment variable is not set');
      throw new Error('Wondercraft API key is missing');
    }

    // If jobId is provided, we're checking status of an existing job
    if (jobId) {
      console.log(`Checking status for job ID: ${jobId}`);
      
      const statusResponse = await fetch(`https://api.wondercraft.ai/v1/podcast/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Error checking job status:', errorText);
        throw new Error(`Failed to check job status: ${statusResponse.status} ${errorText}`);
      }
      
      const statusData = await statusResponse.json();
      console.log('Job status response:', JSON.stringify(statusData));
      
      return new Response(JSON.stringify({ 
        success: true, 
        podcastData: statusData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Otherwise, we're creating a new podcast
    console.log(`Using Host Voice ID: ${hostVoiceId} and Guest Voice ID: ${guestVoiceId}`);
    console.log(`Using Music ID: ${musicId}`);
    
    if (!script) {
      console.error('Missing required parameter: script');
      throw new Error('Script is required');
    }
    
    console.log(`Script length: ${script.length} characters`);
    console.log(`Script first 100 characters: "${script.substring(0, 100)}..."`);
    
    // Format script for Wondercraft
    // Parse the script to separate by HOST: and GUEST: prefixes
    const scriptLines = script.split('\n');
    const formattedScript = [];
    
    console.log('Formatting script for Wondercraft API...');
    console.log(`Script has ${scriptLines.length} lines`);
    
    // Log a few sample lines to debug
    if (scriptLines.length > 0) {
      console.log('Sample lines from script:');
      for (let i = 0; i < Math.min(5, scriptLines.length); i++) {
        console.log(`Line ${i}: "${scriptLines[i]}"`);
      }
    }
    
    // Enhanced script parsing with more flexible matching
    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i].trim();
      
      // Skip empty lines
      if (line === '') continue;
      
      // Try to match HOST: or GUEST: with more flexible patterns
      if (line.toUpperCase().startsWith('HOST:')) {
        formattedScript.push({
          text: line.substring(5).trim(),
          voice_id: hostVoiceId
        });
      } else if (line.toUpperCase().startsWith('GUEST:')) {
        formattedScript.push({
          text: line.substring(6).trim(),
          voice_id: guestVoiceId
        });
      } else if (line.match(/^HOST\s*:/i)) {
        // Match with possible space between HOST and :
        const textContent = line.replace(/^HOST\s*:/i, '').trim();
        formattedScript.push({
          text: textContent,
          voice_id: hostVoiceId
        });
      } else if (line.match(/^GUEST\s*:/i)) {
        // Match with possible space between GUEST and :
        const textContent = line.replace(/^GUEST\s*:/i, '').trim();
        formattedScript.push({
          text: textContent,
          voice_id: guestVoiceId
        });
      }
    }
    
    console.log(`Formatted script with ${formattedScript.length} segments`);
    
    // If no segments found, try alternative parsing approach
    if (formattedScript.length === 0) {
      console.log('No segments found with standard parsing, trying alternative approach...');
      
      // Try to parse blocks of text separated by blank lines
      let currentSpeaker = 'host'; // Start with host
      let currentText = '';
      
      for (let i = 0; i < scriptLines.length; i++) {
        const line = scriptLines[i].trim();
        
        if (line === '') {
          // End of paragraph, add the current text if not empty
          if (currentText !== '') {
            formattedScript.push({
              text: currentText.trim(),
              voice_id: currentSpeaker === 'host' ? hostVoiceId : guestVoiceId
            });
            
            // Switch speaker for next paragraph
            currentSpeaker = currentSpeaker === 'host' ? 'guest' : 'host';
            currentText = '';
          }
        } else {
          // Add this line to the current text
          currentText += ' ' + line;
        }
      }
      
      // Add the last paragraph if not empty
      if (currentText !== '') {
        formattedScript.push({
          text: currentText.trim(),
          voice_id: currentSpeaker === 'host' ? hostVoiceId : guestVoiceId
        });
      }
      
      console.log(`Alternative parsing found ${formattedScript.length} segments`);
    }
    
    if (formattedScript.length === 0) {
      console.error('No valid script segments were found after all parsing attempts');
      throw new Error('Script format is invalid, no valid segments could be extracted');
    }
    
    // Create request body for Wondercraft
    const wondercraftBody = {
      script: formattedScript,
      // Custom music settings with the provided music ID
      music_spec: {
        music_id: musicId, // Use the specific music ID
        fade_in_ms: 1000,
        fade_out_ms: 1000,
        playback_start: 0,
        playback_end: 1000, // Let Wondercraft determine the end automatically
        volume: 0.05
      }
    };
    
    console.log('Sending request to Wondercraft API with payload structure:');
    console.log(`- Number of script segments: ${wondercraftBody.script.length}`);
    console.log('- Sample voice IDs being used:', wondercraftBody.script.length > 0 ? wondercraftBody.script[0].voice_id : 'none');
    console.log('- Music ID being used:', wondercraftBody.music_spec.music_id);
    
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
    console.error('Error in elevenlabs-podcast function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

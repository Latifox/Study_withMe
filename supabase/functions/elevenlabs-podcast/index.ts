
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Wondercraft API endpoints
const WONDERCRAFT_API_URL = "https://api.wondercraft.ai/api/podcast";
const WONDERCRAFT_ALTERNATIVE_URL = "https://api.wondercraft.ai/api/v2/jobs";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const WONDERCRAFT_API_KEY = Deno.env.get('WONDERCRAFT_API_KEY');
  if (!WONDERCRAFT_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Wondercraft API key not configured" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { script, hostVoiceId, guestVoiceId, musicId, lectureId, jobId } = await req.json();
    
    // If jobId is provided, query job status
    if (jobId) {
      console.log(`Checking status for job ID: ${jobId}`);
      
      // Try both API endpoints for status updates
      try {
        // First, try the main endpoint
        const mainResponse = await fetch(`${WONDERCRAFT_API_URL}/${jobId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${WONDERCRAFT_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (mainResponse.ok) {
          const jobStatus = await mainResponse.json();
          console.log('Job status response from main endpoint:', JSON.stringify(jobStatus));
          
          // If the podcast is finished, update the lecture_podcast record
          if (jobStatus.episode_url && lectureId) {
            await updatePodcastRecord(lectureId, jobStatus.episode_url, jobId);
          }
          
          return new Response(
            JSON.stringify({ podcastData: jobStatus }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.warn('Main endpoint returned error, trying alternative endpoint...');
        }
      } catch (error) {
        console.warn('Error with main status endpoint, trying alternative:', error);
      }
      
      // If the main endpoint fails, try the alternative endpoint
      try {
        const alternativeResponse = await fetch(`${WONDERCRAFT_ALTERNATIVE_URL}/${jobId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${WONDERCRAFT_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (alternativeResponse.ok) {
          const alternativeStatus = await alternativeResponse.json();
          console.log('Job status response from alternative endpoint:', JSON.stringify(alternativeStatus));
          
          // If the podcast is finished, update the lecture_podcast record
          if (alternativeStatus.finished && alternativeStatus.url && lectureId) {
            await updatePodcastRecord(lectureId, alternativeStatus.url, jobId);
          }
          
          return new Response(
            JSON.stringify({ podcastData: alternativeStatus }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          const errorText = await alternativeResponse.text();
          throw new Error(`Alternative status endpoint returned error: ${errorText}`);
        }
      } catch (error) {
        console.error('Error with alternative status endpoint:', error);
        throw error;
      }
    }
    
    // If no jobId, generate a new podcast
    if (!script || !hostVoiceId || !guestVoiceId || !lectureId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Generating podcast with hostVoiceId: ${hostVoiceId}, guestVoiceId: ${guestVoiceId}`);
    console.log(`Script length: ${script.length} characters`);
    console.log(`Script first 100 characters: "${script.substring(0, 100)}..."`);
    
    // Format script by ensuring no role prefixes remain in the text sent to Wondercraft
    const scriptLines = script.split('\n');
    const formattedScript = [];
    
    // Clean regex patterns to match and remove various forms of speaker indicators
    const hostPatterns = [
      /^HOST\s*:/i,
      /^\*\*HOST\*\*\s*:/i,
      /^HOST\s*-/i,
      /^\[HOST\]\s*/i
    ];
    
    const guestPatterns = [
      /^GUEST\s*:/i,
      /^\*\*GUEST\*\*\s*:/i,
      /^GUEST\s*-/i,
      /^\[GUEST\]\s*/i
    ];
    
    // Process each line to remove role prefixes and assign correct voice
    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i].trim();
      
      // Skip empty lines
      if (line === '') continue;
      
      // Process host lines
      let isHost = false;
      let isGuest = false;
      let textContent = line;
      
      // Check for host patterns
      for (const pattern of hostPatterns) {
        if (pattern.test(line)) {
          textContent = line.replace(pattern, '').trim();
          isHost = true;
          break;
        }
      }
      
      // Check for guest patterns if not already matched as host
      if (!isHost) {
        for (const pattern of guestPatterns) {
          if (pattern.test(line)) {
            textContent = line.replace(pattern, '').trim();
            isGuest = true;
            break;
          }
        }
      }
      
      // If line has content after processing, add it to script
      if (textContent && (isHost || isGuest)) {
        formattedScript.push({
          text: textContent,
          voice_id: isHost ? hostVoiceId : guestVoiceId
        });
      }
    }
    
    // If no lines were processed correctly, try alternating assumption
    if (formattedScript.length === 0) {
      console.log('No speaker indicators found, assuming alternating host/guest pattern');
      let isHostTurn = true; // Start with host
      
      for (let i = 0; i < scriptLines.length; i++) {
        const line = scriptLines[i].trim();
        if (line === '') {
          // Empty line might indicate speaker change, but don't toggle yet
          continue;
        }
        
        // Add non-empty paragraph with assumed speaker
        formattedScript.push({
          text: line,
          voice_id: isHostTurn ? hostVoiceId : guestVoiceId
        });
        
        // Look ahead to see if next line is empty (paragraph break)
        if (i + 1 < scriptLines.length && scriptLines[i + 1].trim() === '') {
          isHostTurn = !isHostTurn; // Toggle speaker for next paragraph
        }
      }
    }
    
    console.log(`Processed ${formattedScript.length} script segments for Wondercraft`);
    
    // Configure music if provided
    const musicConfig = musicId ? {
      music_id: musicId,
      music_volume: 0.05,  // Set a low volume for background music
      fade_in: 1.5,        // Fade in duration in seconds
      fade_out: 2.0,       // Fade out duration in seconds
    } : undefined;
    
    // Prepare the podcast generation payload
    const podcastPayload = {
      title: "Educational Podcast",
      script: formattedScript,
      settings: {
        audio_style: "podcast",
        pacing: 1.05,       // Slightly faster than natural
        silences: {
          speaker_change: 0.6, // Pause between speakers
          paragraph_change: 0.4, // Pause between paragraphs
          sentence_end: 0.2,    // Pause at end of sentences
        },
        ...(musicConfig && { music: musicConfig })
      }
    };
    
    console.log('Sending request to Wondercraft...');
    
    const response = await fetch(WONDERCRAFT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WONDERCRAFT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(podcastPayload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Wondercraft API error:', errorText);
      throw new Error(`Failed to generate podcast: ${errorText}`);
    }
    
    const podcastData = await response.json();
    console.log('Wondercraft API response:', JSON.stringify(podcastData));
    
    // If we have a job ID and lecture ID, store the job ID in the database
    if (podcastData.id && lectureId) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      console.log(`Updating lecture_podcast record for lecture ${lectureId} with job ID ${podcastData.id}`);
      const { error } = await supabaseClient
        .from('lecture_podcast')
        .update({ job_id: podcastData.id })
        .eq('lecture_id', lectureId);
      
      if (error) {
        console.error('Error updating podcast record with job ID:', error);
      }
    }
    
    return new Response(
      JSON.stringify({ podcastData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in elevenlabs-podcast function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to update the podcast record when processing is complete
async function updatePodcastRecord(lectureId: number, audioUrl: string, jobId: string) {
  try {
    console.log(`Updating lecture_podcast record for lecture ${lectureId} with audio URL`);
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { error } = await supabaseClient
      .from('lecture_podcast')
      .update({ 
        audio_url: audioUrl,
        job_id: jobId,
        is_processed: true 
      })
      .eq('lecture_id', lectureId);
    
    if (error) {
      console.error('Error updating podcast record with audio URL:', error);
      throw error;
    }
    
    console.log('Successfully updated podcast record with audio URL');
  } catch (error) {
    console.error('Error in updatePodcastRecord:', error);
    throw error;
  }
}

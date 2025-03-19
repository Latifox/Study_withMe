
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reqData = await req.json();
    const { script, hostVoiceId, guestVoiceId, musicId, jobId, lectureId } = reqData;

    console.log(`Processing request with lectureId: ${lectureId}, jobId: ${jobId || 'new job'}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // If jobId is provided, check the status of an existing job
    if (jobId) {
      console.log(`Checking status for job: ${jobId}`);
      
      // Get the job status from Wondercraft
      const response = await fetch(`https://api.wondercraft.ai/v1/syntheses/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('WONDERCRAFT_API_KEY')}`,
        },
      });

      if (!response.ok) {
        console.error('Error response from Wondercraft API:', await response.text());
        throw new Error('Failed to get job status from Wondercraft');
      }

      const data = await response.json();
      console.log('Job status response:', data);
      
      // If the job is finished, download the audio and store it
      if ((data.state === 'ready' || data.finished === true) && (data.episode_url || data.url)) {
        const audioUrl = data.episode_url || data.url;
        console.log('Podcast is ready, downloading from URL:', audioUrl);
        
        try {
          // First ensure the podcast_audio bucket exists
          const bucketName = 'podcast_audio';
          await ensureBucketExists(supabaseClient, bucketName);
          
          // Download the audio file
          console.log('Starting download of podcast audio...');
          const audioResponse = await fetch(audioUrl);
          
          if (!audioResponse.ok) {
            throw new Error(`Failed to download audio file: ${audioResponse.statusText}`);
          }
          
          console.log('Podcast audio downloaded successfully, creating buffer...');
          const audioBuffer = await audioResponse.arrayBuffer();
          
          // Create the file path with a timestamp to avoid conflicts
          const timestamp = new Date().getTime();
          const fileName = `podcast_${timestamp}.mp3`;
          
          // Create a directory structure based on the lecture ID
          const folderPath = `lecture_${lectureId}`;
          const filePath = `${folderPath}/${fileName}`;
          
          console.log(`Uploading podcast to storage at path: ${filePath}`);
          
          // Upload the audio file to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from(bucketName)
            .upload(filePath, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });
            
          if (uploadError) {
            console.error('Error uploading audio to storage:', uploadError);
            throw uploadError;
          }
          
          console.log('Podcast audio uploaded successfully:', uploadData);
          
          // Update the database record with the storage path
          const { data: updateData, error: updateError } = await supabaseClient
            .from('lecture_podcast')
            .update({ 
              stored_audio_path: filePath,
              is_processed: true,
              audio_url: audioUrl // Also store the original URL as a fallback
            })
            .eq('lecture_id', lectureId)
            .select()
            .single();
            
          if (updateError) {
            console.error('Error updating database with storage path:', updateError);
            throw updateError;
          }
          
          console.log('Database updated with storage path:', updateData);
          
          // Return the complete data with the storage path
          return new Response(
            JSON.stringify({ 
              podcastData: { 
                ...data, 
                stored_audio_path: filePath 
              } 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (storageError) {
          console.error('Error storing podcast audio:', storageError);
          // If storage fails, just return the original data without local storage
          return new Response(
            JSON.stringify({ podcastData: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Return the status data if the job is not yet complete
      return new Response(
        JSON.stringify({ podcastData: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no jobId was provided, create a new podcast generation job
    if (!script) {
      throw new Error('Script is required for podcast generation');
    }

    console.log('Creating new podcast with script length:', script.length);
    const response = await fetch('https://api.wondercraft.ai/v1/syntheses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('WONDERCRAFT_API_KEY')}`,
      },
      body: JSON.stringify({
        script,
        voice_settings: [
          {
            gender: "female",
            name: "Host",
            voice_id: hostVoiceId,
          },
          {
            gender: "male",
            name: "Guest",
            voice_id: guestVoiceId,
          },
        ],
        music_id: musicId,
      }),
    });

    if (!response.ok) {
      console.error('Error response from Wondercraft API:', await response.text());
      throw new Error('Failed to create podcast with Wondercraft');
    }

    const data = await response.json();
    console.log('Podcast creation response:', data);

    // Save the job ID to the database for future status checks
    const jobIdToSave = data.id;
    
    if (jobIdToSave) {
      const { error } = await supabaseClient
        .from('lecture_podcast')
        .update({ 
          job_id: jobIdToSave
        })
        .eq('lecture_id', lectureId);
        
      if (error) {
        console.error('Error saving job ID to database:', error);
      } else {
        console.log('Saved job ID to database:', jobIdToSave);
      }
    }

    return new Response(
      JSON.stringify({ podcastData: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in elevenlabs-podcast function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to check if a storage bucket exists and create it if it doesn't
async function ensureBucketExists(supabaseClient, bucketName) {
  try {
    console.log(`Checking if bucket ${bucketName} exists...`);
    // Try to get the bucket first
    const { data: bucket, error } = await supabaseClient.storage.getBucket(bucketName);
    
    if (error) {
      console.log(`Bucket ${bucketName} doesn't exist, creating it...`);
      const { data, error: createError } = await supabaseClient.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB limit for podcast files
      });
      
      if (createError) {
        console.error(`Error creating ${bucketName} bucket:`, createError);
        return false;
      }
      console.log(`Successfully created ${bucketName} bucket`);
      return true;
    }
    
    console.log(`Bucket ${bucketName} already exists`);
    return true;
  } catch (error) {
    console.error('Error checking/creating bucket:', error);
    return false;
  }
}

// Helper function to create client for Supabase
function createClient(supabaseUrl, supabaseKey) {
  return {
    from: (table) => ({
      select: (columns) => ({
        eq: (column, value) => ({
          single: () => fetch(`${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}&select=${columns || '*'}`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }).then(res => res.json().then(data => ({ data: data[0] || null, error: null }))),
        }),
        limit: (limit) => ({
          single: () => fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns || '*'}&limit=${limit}`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }).then(res => res.json().then(data => ({ data: data[0] || null, error: null }))),
        }),
      }),
      update: (updates) => ({
        eq: (column, value) => ({
          select: () => ({
            single: () => fetch(`${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}`, {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
              },
              body: JSON.stringify(updates),
            }).then(res => res.json().then(data => ({ data: data[0] || null, error: null }))),
          }),
        }),
      }),
      insert: (values) => ({
        select: () => ({
          single: () => fetch(`${supabaseUrl}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(values),
          }).then(res => res.json().then(data => ({ data: data[0] || null, error: null }))),
        }),
      }),
    }),
    storage: {
      getBucket: (name) => fetch(`${supabaseUrl}/storage/v1/bucket/${name}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }).then(res => res.ok ? res.json().then(data => ({ data, error: null })) : res.json().then(error => ({ data: null, error }))),
      createBucket: (name, options) => fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, public: options?.public, file_size_limit: options?.fileSizeLimit }),
      }).then(res => res.ok ? res.json().then(data => ({ data, error: null })) : res.json().then(error => ({ data: null, error }))),
      from: (bucket) => ({
        upload: (path, fileBody, options) => fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': options?.contentType || 'application/octet-stream',
            'x-upsert': options?.upsert ? 'true' : 'false',
          },
          body: fileBody,
        }).then(res => res.ok ? res.json().then(data => ({ data, error: null })) : res.json().then(error => ({ data: null, error }))),
      }),
    },
  };
}

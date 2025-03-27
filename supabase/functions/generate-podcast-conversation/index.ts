
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const { lectureId } = await req.json();
    console.log('Processing podcast generation for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First check if podcast already exists
    const { data: existingPodcast, error: podcastCheckError } = await supabaseClient
      .from('lecture_podcast')
      .select('*')
      .eq('lecture_id', lectureId)
      .single();

    if (podcastCheckError && podcastCheckError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected if no podcast exists yet
      console.error('Error checking existing podcast:', podcastCheckError);
      throw new Error('Failed to check existing podcast');
    }

    // If podcast already exists, return it
    if (existingPodcast) {
      console.log('Podcast already exists for lecture', lectureId);
      return new Response(JSON.stringify({ 
        success: true, 
        podcast: existingPodcast,
        message: 'Existing podcast retrieved' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get lecture content and AI config
    const [lectureResponse, configResponse] = await Promise.all([
      supabaseClient
        .from('lectures')
        .select('content, title')
        .eq('id', lectureId)
        .single(),
      supabaseClient
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .maybeSingle()
    ]);

    if (lectureResponse.error) {
      console.error('Error fetching lecture:', lectureResponse.error);
      throw new Error('Failed to fetch lecture content');
    }

    const lecture = lectureResponse.data;
    const config = configResponse.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      custom_instructions: ''
    };

    console.log('Using AI config:', config);
    
    const podcastPrompt = `
    Create a podcast-style conversation about the following lecture titled "${lecture.title}". 
    
    LECTURE CONTENT:
    ${lecture.content}
    
    FORMAT:
    Create a natural, engaging podcast conversation between two personas:
    1. The host, a friendly, curious female podcast host who guides the conversation
    2. The guest, a knowledgeable male expert who provides detailed explanations
    
    REQUIREMENTS:
    - Include a proper introduction with the host welcoming listeners and introducing the topic and guest
    - Create natural transitions between topics
    - Include questions, responses, and back-and-forth exchanges
    - Make sure the conversation flows naturally with appropriate segues
    - End with a conclusion and sign-off
    - Keep the overall tone conversational, engaging and educational
    - Adjust the level of detail based on this detail level (0-1): ${config.detail_level}
    - Adjust the creativity in examples and explanations based on this creativity level (0-1): ${config.creativity_level}
    
    ${config.custom_instructions ? `ADDITIONAL INSTRUCTIONS:\n${config.custom_instructions}\n` : ''}
    
    FORMAT YOUR RESPONSE AS A DIALOGUE SCRIPT EACH PARAGRAPH REPRESENTING A PERSON'S REPLY, DON'T USE ROLE IDENTIFIERS, SEPARATE EACH PARAGRAPH WITH AN EMPTY LINE, THE FIRST LINE OF THE DIALOGUE SHOULD BE THE HOST.
    NEVER USE ROLE IDENTIFIERS AT THE BEGINING OF THE LINE. ONLY USE "-".
    
    Please create a complete podcast episode that covers the key points from the lecture in an engaging way. KEEP THE SCRIPT LENGTH UNDER 2000 characters!
    `;

    console.log('Sending request to OpenAI...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an AI specialized in creating educational podcast scripts.' },
          { role: 'user', content: podcastPrompt }
        ],
        temperature: config.temperature,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('Failed to get response from OpenAI');
    }

    const data = await openAIResponse.json();
    const fullScript = data.choices[0].message.content;
    console.log('Received podcast script with length:', fullScript.length);

    // Parse the script to separate by speaker but don't use these for elevenlabs
    const hostLines = [];
    const guestLines = [];
    
    const lines = fullScript.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('HOST:')) {
        hostLines.push(line.substring(5).trim());
      } else if (line.startsWith('GUEST:')) {
        guestLines.push(line.substring(6).trim());
      }
    }

    const hostScript = hostLines.join('\n\n');
    const guestScript = guestLines.join('\n\n');

    console.log('Extracted script segments - Host:', hostLines.length, 'lines, Guest:', guestLines.length, 'lines');

    // Store the podcast in the database
    const { data: podcastData, error: podcastError } = await supabaseClient
      .from('lecture_podcast')
      .insert({
        lecture_id: lectureId,
        full_script: fullScript,
        host_script: hostScript,
        expert_script: guestScript,
        student_script: "" // Keeping this field for backward compatibility
      })
      .select()
      .single();

    if (podcastError) {
      console.error('Error storing podcast:', podcastError);
      throw new Error('Failed to store podcast');
    }

    console.log('Successfully stored podcast with ID:', podcastData.id);

    return new Response(JSON.stringify({ 
      success: true, 
      podcast: podcastData,
      message: 'Podcast successfully generated' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-podcast-conversation function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

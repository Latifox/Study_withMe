import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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

    if (!lectureId) {
      throw new Error('Lecture ID is required');
    }

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
    
    if (!lecture?.content) {
      throw new Error('Lecture content is empty or missing');
    }

    const config = configResponse.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      custom_instructions: ''
    };

    console.log('Using AI config:', config);
    
    // Create a shorter version of the content if it's too long
    const maxContentLength = 6000;
    let truncatedContent = lecture.content;
    if (lecture.content.length > maxContentLength) {
      truncatedContent = lecture.content.substring(0, maxContentLength) + 
        "\n[Content truncated due to length constraints. Please focus on the main concepts from the beginning of the lecture.]";
      console.log(`Lecture content truncated from ${lecture.content.length} to ${truncatedContent.length} characters`);
    }
    
    const podcastPrompt = `
    Create a podcast-style conversation about the following lecture titled "${lecture.title}". 
    
    LECTURE CONTENT:
    ${truncatedContent}
    
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
    
    FORMAT YOUR RESPONSE AS A DIALOGUE SCRIPT:
    - The first paragraph must be the host's introduction
    - Alternate between host and guest for each paragraph
    - Separate each paragraph with an empty line (crucial for voice processing)
    - DO NOT use role identifiers like "Host:" or "Guest:" at the beginning of paragraphs
    
    IMPORTANT LENGTH CONSTRAINT: Your response MUST be under 2000 characters total. This is a strict requirement. Prioritize the most important concepts and keep explanations concise. If you generate more than 2000 characters, your response will be rejected.
    
    Please create a complete podcast episode that covers the key points from the lecture in an engaging way.
    `;

    console.log('Sending request to OpenAI...');
    
    // Use a try/catch specifically for the OpenAI request
    let openAIResponse;
    try {
      openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',  // Updated to use the latest model
          messages: [
            { role: 'system', content: 'You are an AI specialized in creating educational podcast scripts.' },
            { role: 'user', content: podcastPrompt }
          ],
          temperature: config.temperature,
          max_tokens: 1000,  // Limiting token count to help enforce character limit
        }),
      });
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw new Error(`OpenAI API call failed: ${error.message}`);
    }

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error(`OpenAI API error (${openAIResponse.status}):`, errorText);
      throw new Error(`Failed to get response from OpenAI (Status ${openAIResponse.status})`);
    }

    const data = await openAIResponse.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected OpenAI response format:', data);
      throw new Error('Invalid response format from OpenAI');
    }
    
    const fullScript = data.choices[0].message.content;
    console.log('Received podcast script with length:', fullScript.length);
    
    if (fullScript.length > 2000) {
      console.warn(`Script exceeds 2000 character limit (${fullScript.length} chars). Truncating...`);
      // We could implement truncation logic here if needed
    }

    // Parse the script to separate by paragraphs
    const paragraphs = fullScript.split('\n\n').filter(p => p.trim() !== '');
    console.log('Parsed script into paragraphs:', paragraphs.length);
    
    if (paragraphs.length < 2) {
      console.warn('Not enough paragraphs to create a conversation');
      throw new Error('Generated script does not contain enough paragraphs for a conversation');
    }
    
    // Separate host and guest content based on alternating paragraphs
    const hostParagraphs = paragraphs.filter((_, i) => i % 2 === 0);
    const guestParagraphs = paragraphs.filter((_, i) => i % 2 === 1);
    
    const hostScript = hostParagraphs.join('\n\n');
    const guestScript = guestParagraphs.join('\n\n');

    console.log('Extracted script segments - Host:', hostParagraphs.length, 'paragraphs, Guest:', guestParagraphs.length, 'paragraphs');

    // Store the podcast in the database
    let podcastData;
    try {
      const { data, error: podcastError } = await supabaseClient
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
        throw new Error(`Failed to store podcast: ${podcastError.message}`);
      }
      
      podcastData = data;
      console.log('Successfully stored podcast with ID:', podcastData.id);
    } catch (error) {
      console.error('Database error when storing podcast:', error);
      throw new Error(`Database operation failed: ${error.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      podcast: podcastData,
      message: 'Podcast successfully generated' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-podcast-conversation function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error occurred',
      success: false,
      message: 'Failed to generate podcast'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

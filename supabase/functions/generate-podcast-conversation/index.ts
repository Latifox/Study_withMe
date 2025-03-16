
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    if (!lectureId) {
      return new Response(
        JSON.stringify({ error: 'Missing lectureId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating podcast conversation for lecture ID: ${lectureId}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if a podcast already exists for this lecture
    const { data: existingPodcast, error: checkError } = await supabase
      .from('lecture_podcast')
      .select('id, host_script, expert_script, student_script, full_script')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing podcast:', checkError);
      throw checkError;
    }

    // If podcast exists, return it
    if (existingPodcast) {
      console.log('Found existing podcast, returning it');
      return new Response(
        JSON.stringify({ 
          success: true, 
          podcast: existingPodcast,
          isExisting: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no podcast exists, fetch lecture content and AI config
    const [lectureResult, aiConfigResult] = await Promise.all([
      supabase
        .from('lectures')
        .select('content, title')
        .eq('id', lectureId)
        .single(),
      supabase
        .from('lecture_ai_configs')
        .select('temperature, creativity_level, detail_level, content_language, custom_instructions')
        .eq('lecture_id', lectureId)
        .maybeSingle()
    ]);

    if (lectureResult.error) {
      console.error('Error fetching lecture:', lectureResult.error);
      throw lectureResult.error;
    }

    const { content: lectureContent, title: lectureTitle } = lectureResult.data;
    
    if (!lectureContent) {
      return new Response(
        JSON.stringify({ error: 'No lecture content found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use default AI config if none exists
    const aiConfig = aiConfigResult.data || {
      temperature: 0.7,
      creativity_level: 0.7,  // Higher creativity for podcast format
      detail_level: 0.6,
      content_language: null,
      custom_instructions: ""
    };

    console.log('Using AI config:', JSON.stringify(aiConfig, null, 2));

    // Create podcast conversation using OpenAI
    const podcastScripts = await generatePodcastConversation(
      lectureContent, 
      lectureTitle,
      aiConfig
    );

    // Store the podcast in the database
    const { data: storedPodcast, error: storeError } = await supabase
      .from('lecture_podcast')
      .insert({
        lecture_id: lectureId,
        host_script: podcastScripts.hostScript,
        expert_script: podcastScripts.expertScript,
        student_script: podcastScripts.studentScript,
        full_script: podcastScripts.fullScript
      })
      .select()
      .single();

    if (storeError) {
      console.error('Error storing podcast:', storeError);
      throw storeError;
    }

    console.log('Podcast created and stored successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        podcast: storedPodcast,
        isExisting: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating podcast conversation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generatePodcastConversation(
  lectureContent: string, 
  lectureTitle: string, 
  aiConfig: {
    temperature: number;
    creativity_level: number;
    detail_level: number;
    content_language: string | null;
    custom_instructions: string | null;
  }
): Promise<{
  hostScript: string;
  expertScript: string;
  studentScript: string;
  fullScript: string;
}> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }
  
  // Prepare language instructions
  const languageInstructions = aiConfig.content_language 
    ? `Generate the podcast conversation in ${aiConfig.content_language} language only.` 
    : '';
  
  // Construct the system message
  const systemMessage = `
    You are an AI specialized in creating educational podcast scripts about academic topics.
    ${languageInstructions}
    Follow these guidelines:
    
    1. Create a conversation between three speakers: 
       - HOST: A friendly podcast host who introduces topics, asks questions, and guides the conversation
       - EXPERT: A knowledgeable professor or researcher who explains concepts in depth
       - STUDENT: A curious student who asks clarifying questions and represents the listener's perspective
    
    2. Format requirements:
       - Start the podcast with an introduction by the HOST
       - Clearly indicate each speaker with their role name in capital letters, followed by a colon
       - Make the conversation natural with transitions, questions, and back-and-forth exchanges
       - Include an introduction, main discussion, and conclusion
       - Break up long explanations with questions or comments from other speakers
       - End with a summary and sign-off by the HOST
    
    3. Content guidelines:
       - Balance educational depth (${Math.round(aiConfig.detail_level * 100)}% detail level) with engagement
       - Use a conversational tone with appropriate enthusiasm
       - Inject personality and light humor where appropriate
       - Adjust creativity level to ${Math.round(aiConfig.creativity_level * 100)}%
       - Keep factual information accurate to the lecture content
       
    ${aiConfig.custom_instructions || ''}
  `;

  // Construct the user message with the lecture content
  const userMessage = `
    Create a podcast script about the following lecture titled "${lectureTitle}".
    
    Lecture content:
    ${lectureContent.substring(0, 15000)}  // Truncate to avoid token limits
    
    Turn this lecture content into an engaging podcast conversation following the format requirements in your instructions.
    Make sure to separate the scripts for each speaker so they can be processed separately.
  `;

  try {
    console.log('Calling OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',  // Using the mini model for cost efficiency
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        temperature: aiConfig.temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const fullScript = data.choices[0].message.content;
    
    // Extract individual speaker scripts
    const hostLines = extractSpeakerLines(fullScript, 'HOST');
    const expertLines = extractSpeakerLines(fullScript, 'EXPERT');
    const studentLines = extractSpeakerLines(fullScript, 'STUDENT');
    
    return {
      hostScript: hostLines.join('\n\n'),
      expertScript: expertLines.join('\n\n'),
      studentScript: studentLines.join('\n\n'),
      fullScript
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error(`Failed to generate podcast: ${error.message}`);
  }
}

function extractSpeakerLines(script: string, speakerRole: string): string[] {
  const lines = script.split('\n');
  const speakerLines: string[] = [];
  let collectingLine = false;
  let currentLine = '';
  
  for (const line of lines) {
    // Check if line starts with the speaker role indicator
    if (line.trim().startsWith(`${speakerRole}:`)) {
      // If we were collecting a previous line, save it
      if (collectingLine && currentLine) {
        speakerLines.push(currentLine.trim());
      }
      
      // Start collecting a new line
      collectingLine = true;
      currentLine = line.trim().substring(speakerRole.length + 1).trim();
    } else if (collectingLine) {
      // Check if another speaker starts talking
      if (line.trim().match(/^(HOST|EXPERT|STUDENT):/)) {
        // Save current line and stop collecting
        speakerLines.push(currentLine.trim());
        collectingLine = false;
        currentLine = '';
      } else {
        // Continue current line
        currentLine += ' ' + line.trim();
      }
    }
  }
  
  // Don't forget to add the last line if we were collecting one
  if (collectingLine && currentLine) {
    speakerLines.push(currentLine.trim());
  }
  
  return speakerLines;
}

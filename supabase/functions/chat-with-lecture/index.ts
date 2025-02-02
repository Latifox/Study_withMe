import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, message } = await req.json();
    console.log('Processing chat for lecture:', lectureId, 'with message:', message);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    let systemMessage = `You are a helpful AI assistant that helps students understand their lecture content. 
    You have access to the following lecture content titled "${lecture.title}":
    
    ${lecture.content}
    
    Base your responses on this lecture content. If asked something not covered in the lecture,
    politely inform that it's not covered in this specific lecture material.
    
    Adjust your responses based on these parameters:
    - Creativity Level: ${config.creativity_level} (higher means more creative and exploratory responses)
    - Detail Level: ${config.detail_level} (higher means more detailed and comprehensive responses)`;

    if (config.custom_instructions) {
      systemMessage += `\n\nAdditional instructions for handling this lecture:\n${config.custom_instructions}`;
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message }
        ],
        temperature: config.temperature,
        stream: true,
      }),
    });

    if (!openAIResponse.ok) {
      console.error('OpenAI API error:', await openAIResponse.text());
      throw new Error('Failed to get response from OpenAI');
    }

    // Transform the response into a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        const reader = openAIResponse.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim() === '') continue;
              if (line.trim() === 'data: [DONE]') continue;
              if (line.startsWith('data: ')) {
                controller.enqueue(line + '\n');
              }
            }
          }
        } catch (error) {
          console.error('Error in stream processing:', error);
          controller.error(error);
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in chat-with-lecture function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    console.log('Generate segments structure function called');
    const { lectureId, lectureContent, lectureTitle } = await req.json();

    if (!lectureId || !lectureContent || !lectureTitle) {
      console.error('Missing required parameters:', { lectureId, contentLength: lectureContent?.length, lectureTitle });
      throw new Error('Missing required parameters');
    }

    console.log('Received lecture content length:', lectureContent.length);
    console.log('Lecture title:', lectureTitle);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch AI configuration
    const { data: aiConfig } = await supabase
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    // Use default values if no config is found
    const config = aiConfig || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      content_language: 'English',
      custom_instructions: ''
    };

    console.log('Using AI config:', config);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      throw new Error('OpenAI API key not found');
    }

    const systemPrompt = `You are an expert educational content creator. Analyze the lecture content and create a logical structure of segments 
    in ${config.detail_level > 0.5 ? 'detailed' : 'concise'} format using 
    ${config.content_language || 'English'} language. 
    ${config.custom_instructions ? `Additional instructions: ${config.custom_instructions}` : ''}`;

    console.log('Sending request to OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: config.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Given this lecture titled "${lectureTitle}", create a logical segments structure.
            Create a list of segments (3-7 segments). Each segment should contain:
            1. A clear title focusing on one main concept
            2. A brief description of what will be covered
            3. An appropriate sequence number
            
            Return ONLY valid JSON without any markdown formatting, following this exact structure:
            {
              "segments": [
                {
                  "title": "segment title",
                  "segment_description": "description of what this segment covers",
                  "sequence_number": 1
                },
                ...
              ]
            }
              Content to analyze:
            ${lectureContent}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid response from OpenAI');
      throw new Error('Invalid response from OpenAI');
    }

    let segments;
    try {
      // Parse the generated content, handling potential markdown formatting
      const jsonStr = data.choices[0].message.content.replace(/```json\n?|\n?```/g, '');
      segments = JSON.parse(jsonStr);
      console.log('Successfully parsed segments');
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.log('Raw OpenAI response:', data.choices[0].message.content);
      throw new Error('Failed to parse segment structure from OpenAI response');
    }

    // Insert segments into the database
    if (segments?.segments?.length > 0) {
      const { error: deleteError } = await supabase
        .from('lecture_segments')
        .delete()
        .eq('lecture_id', lectureId);

      if (deleteError) {
        console.error('Error deleting existing segments:', deleteError);
        throw deleteError;
      }

      const { error: insertError } = await supabase
        .from('lecture_segments')
        .insert(
          segments.segments.map((segment: any) => ({
            lecture_id: lectureId,
            title: segment.title,
            segment_description: segment.segment_description,
            sequence_number: segment.sequence_number,
          }))
        );

      if (insertError) {
        console.error('Error inserting segments:', insertError);
        throw insertError;
      }
      
      console.log('Segments saved to database successfully');
    }

    return new Response(JSON.stringify(segments), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-segments-structure:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

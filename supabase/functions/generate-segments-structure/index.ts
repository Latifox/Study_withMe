
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, lectureContent, lectureTitle } = await req.json();
    
    if (!lectureId || !lectureContent) {
      throw new Error('Missing required parameters');
    }

    console.log('Generating segments structure for lecture:', lectureId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Fetch AI configuration and lecture language
    const { data: aiConfig, error: configError } = await supabaseClient
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .single();

    if (configError) {
      console.error('Error fetching AI config:', configError);
    }

    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('original_language')
      .eq('id', lectureId)
      .single();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
    }

    // Determine content language
    const targetLanguage = aiConfig?.content_language || lecture?.original_language || 'English';
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const temperature = aiConfig?.temperature || 0.7;
    const creativityLevel = aiConfig?.creativity_level || 0.5;
    const detailLevel = aiConfig?.detail_level || 0.6;
    const customInstructions = aiConfig?.custom_instructions || '';

    // Prepare system message based on AI configuration
    const systemMessage = `You are an expert educational content organizer tasked with breaking down lecture content into logical segments.
Configuration:
- Target Language: ${targetLanguage}
- Creativity Level: ${creativityLevel} (higher means more creative segment organization)
- Detail Level: ${detailLevel} (higher means more detailed descriptions)
${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

Guidelines:
1. Generate titles and descriptions in ${targetLanguage}
2. Create clear, focused segments
3. Each segment should cover a distinct subtopic
4. Maintain academic rigor while being accessible
5. Scale detail level according to configuration (${detailLevel})
6. Return only a valid JSON array of segments`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          {
            role: 'user',
            content: `Break down this lecture into logical segments:

Lecture Title: ${lectureTitle}
Content: ${lectureContent}

For each segment, provide:
1. A clear, concise title
2. A brief description of the content
3. The sequence number

Generate the response as a JSON array with this structure:
{
  "segments": [
    {
      "title": "segment title",
      "segment_description": "brief description of the segment content",
      "sequence_number": 1
    },
    ...
  ]
}`
          }
        ],
        temperature: temperature
      })
    });

    const data = await response.json();
    console.log('OpenAI response received');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI');
    }

    const content = data.choices[0].message.content;
    let parsedContent;
    
    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      throw new Error('Failed to parse AI-generated structure');
    }

    if (!parsedContent.segments || !Array.isArray(parsedContent.segments)) {
      throw new Error('Invalid segments structure');
    }

    // Store segments in the database
    for (const segment of parsedContent.segments) {
      const { error: segmentError } = await supabaseClient
        .from('lecture_segments')
        .upsert({
          lecture_id: lectureId,
          title: segment.title,
          segment_description: segment.segment_description,
          sequence_number: segment.sequence_number
        });

      if (segmentError) {
        console.error('Error storing segment:', segmentError);
        throw segmentError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        segments: parsedContent.segments
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-segments-structure:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

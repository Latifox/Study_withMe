
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('Received request for lecture:', lectureId);
    console.log('Lecture title:', lectureTitle);

    if (!lectureContent) {
      throw new Error('No lecture content provided');
    }

    console.log('Content length:', lectureContent.length);
    console.log('First 500 characters of content:', lectureContent.substring(0, 500));

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('Missing OpenAI API key');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing educational content and breaking it down into logical segments.
            Your task is to analyze lecture content and create meaningful, content-specific segments that accurately reflect the actual material.
            You must read and understand the content thoroughly before creating segments.
            Each segment must be based on the actual topics and concepts present in the lecture content.
            Do not generate generic or template-based segments.
            Each segment's title and description must directly reference specific concepts, terms, or ideas from the lecture content.`
          },
          {
            role: 'user',
            content: `You are analyzing a lecture titled "${lectureTitle}". 
            Read through the following lecture content carefully and break it into 5-8 logical segments.
            Each segment must be based on the actual content and topics covered in the lecture.
            
            For each segment:
            1. Create a title that reflects the specific concept or topic from the lecture
            2. Write a description of 3-5 sentences that outlines the actual content that appears in the lecture
            
            The descriptions must:
            - Reference specific concepts, terms, and examples from the lecture content
            - Explain how these specific concepts relate to each other
            - Not use generic descriptions - they must be based on the actual lecture material
            - Build progressively on previous segments in the order they appear in the lecture
            
            Return the segments in this exact JSON format:
            {
              "segments": [
                {
                  "title": "segment title",
                  "segment_description": "description referencing actual lecture content"
                }
              ]
            }

            Here's the lecture content to analyze:
            ${lectureContent}`
          }
        ],
        temperature: 0.3, // Lower temperature for more focused output
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate segments: ' + error);
    }

    const data = await response.json();
    console.log('Received response from OpenAI');
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    // Log the raw response from OpenAI
    console.log('Raw OpenAI response:', data.choices[0].message.content);

    const segments = JSON.parse(data.choices[0].message.content);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Delete existing segments for this lecture
    const { error: deleteError } = await supabaseClient
      .from('lecture_segments')
      .delete()
      .eq('lecture_id', lectureId);

    if (deleteError) {
      console.error('Error deleting existing segments:', deleteError);
      throw deleteError;
    }

    // Insert new segments with sequence numbers
    const formattedSegments = segments.segments.map((segment: any, index: number) => ({
      lecture_id: lectureId,
      sequence_number: index + 1,
      title: segment.title,
      segment_description: segment.segment_description
    }));

    const { error: insertError } = await supabaseClient
      .from('lecture_segments')
      .insert(formattedSegments);

    if (insertError) {
      console.error('Error inserting segments:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        message: 'Segments created successfully', 
        segments: formattedSegments 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

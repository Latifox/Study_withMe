
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.20.0';
import { corsHeaders } from './cors.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const { lectureId, lectureContent } = await req.json();
    console.log('Received request for lecture:', lectureId);
    
    if (!lectureContent) {
      console.error('No content provided');
      throw new Error('No content provided');
    }

    if (!lectureId) {
      console.error('No lecture ID provided');
      throw new Error('No lecture ID provided');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let segments;
    console.log('Making OpenAI request...');
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
            For each segment, write a detailed description of 3-5 sentences that explains exactly what content should be covered.
            Your output must be a valid JSON object with no markdown syntax or code blocks.
            Focus on creating narrative descriptions that explain relationships between concepts and what specific points need to be addressed.`
          },
          {
            role: 'user',
            content: `Analyze this content and break it down into 4-8 logical learning segments. For each segment:
            1. Give it a clear, descriptive title
            2. Write a detailed 3-5 sentence description explaining exactly what content should be covered
            3. Return ONLY a JSON object with this exact structure, no markdown or text:
            {
              "segments": [
                {
                  "title": "segment title",
                  "segment_description": "detailed 3-5 sentence description"
                }
              ]
            }
            
            Here's the content to analyze: ${lectureContent}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    console.log('Received OpenAI response');

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid response format from OpenAI:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    try {
      console.log('Parsing OpenAI response...');
      const rawContent = data.choices[0].message.content;
      console.log('Raw OpenAI response:', rawContent);
      
      // Clean the response: remove any markdown code block syntax
      const cleanedContent = rawContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      console.log('Cleaned content:', cleanedContent);
      
      segments = JSON.parse(cleanedContent);
      console.log('Parsed segments:', JSON.stringify(segments, null, 2));
      
      if (!segments.segments || !Array.isArray(segments.segments)) {
        throw new Error('Invalid segments structure');
      }

      segments.segments.forEach((segment: any, index: number) => {
        if (!segment.title || typeof segment.title !== 'string') {
          throw new Error(`Invalid title in segment ${index}`);
        }
        if (!segment.segment_description || typeof segment.segment_description !== 'string') {
          throw new Error(`Invalid description in segment ${index}`);
        }
        // Add sequence number to each segment
        segment.sequence_number = index + 1;
      });

    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      throw new Error(`Failed to parse segments from OpenAI response: ${error.message}`);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    if (!segments || !Array.isArray(segments.segments)) {
      throw new Error('Invalid segments data structure');
    }

    console.log(`Saving ${segments.segments.length} segments for lecture ${lectureId}`);

    const { error: insertError } = await supabaseClient
      .from('lecture_segments')
      .upsert(
        segments.segments.map(segment => ({
          lecture_id: lectureId,
          title: segment.title,
          segment_description: segment.segment_description,
          sequence_number: segment.sequence_number
        }))
      );

    if (insertError) {
      console.error('Error inserting segments:', insertError);
      throw insertError;
    }

    console.log('Successfully saved segments');

    return new Response(
      JSON.stringify({ 
        segments: segments.segments,
        message: 'Segments created successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});


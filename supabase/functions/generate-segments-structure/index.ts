
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.1';

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
    const { lectureContent, lectureId } = await req.json();
    
    console.log('Request received for lecture:', lectureId);
    console.log('Content length:', lectureContent?.length || 0);

    if (!lectureContent || typeof lectureContent !== 'string') {
      console.error('Invalid or missing content:', lectureContent);
      throw new Error('No content provided or invalid content format');
    }

    if (!lectureId) {
      console.error('No lecture ID provided');
      throw new Error('Lecture ID is required');
    }

    console.log('Generating segment structure...');

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
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
                  "title": "Segment Title",
                  "description": "Detailed 3-5 sentence description..."
                }
              ]
            }
            
            Here is the content to analyze:
            ${lectureContent}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received OpenAI response');

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid response format from OpenAI:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    let segments;
    try {
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
        if (!segment.description || typeof segment.description !== 'string') {
          throw new Error(`Invalid description in segment ${index}`);
        }
      });
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.error('Raw response:', data.choices[0].message.content);
      throw new Error(`Failed to parse segments from OpenAI response: ${error.message}`);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    console.log(`Saving ${segments.segments.length} segments for lecture ${lectureId}`);

    const { error: insertError } = await supabaseClient
      .from('lecture_segments')
      .upsert(
        segments.segments.map((segment: any, index: number) => ({
          lecture_id: lectureId,
          sequence_number: index + 1,
          title: segment.title,
          segment_description: segment.description
        }))
      );

    if (insertError) {
      console.error('Error inserting segments:', insertError);
      throw new Error(`Failed to save segments: ${insertError.message}`);
    }

    console.log('Successfully saved segments');

    return new Response(
      JSON.stringify({ 
        message: 'Segments generated and saved successfully',
        segmentCount: segments.segments.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-segments-structure:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
            content: `You are an expert professor tasked with breaking down lecture content into logical learning segments.
            Your goal is to create 5-8 segments that will guide students through the material in a clear, pedagogical manner.
            For each segment:
            1. Create a specific, content-based title that reflects what will be taught
            2. Write a description in a professorial voice that:
               - Directly addresses students ("In this segment, you will learn...")
               - Outlines specific learning objectives
               - Maintains a supportive, encouraging tone
               - Uses active voice and clear language
               - Does not repeat concepts covered in other segments
               - Is 3-5 sentences long
            
            Example format:
            {
              "segments": [
                {
                  "title": "Introduction to Electric Field Theory",
                  "segment_description": "In this segment, you will learn the fundamental concepts of electric fields and their mathematical representation. We will explore how charged particles create electric fields and understand the significance of field lines in visualizing these invisible forces. You will develop the skills to calculate field strength at various points and appreciate how this knowledge forms the foundation for understanding more complex electromagnetic phenomena."
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `As an expert professor teaching a course, review this lecture titled "${lectureTitle}" and create 5-8 pedagogical segments.
            Each segment should build progressively on previous concepts and guide students through the material.
            
            Here's the lecture content to analyze:
            ${lectureContent}`
          }
        ],
        temperature: 0.3,
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

    // Log the raw response
    console.log('Raw OpenAI response:', data.choices[0].message.content);

    // Parse JSON without code block markers if present
    let cleanContent = data.choices[0].message.content.replace(/```json\n?|\n?```/g, '');
    const segments = JSON.parse(cleanContent);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete existing segments for this lecture
    const { error: deleteError } = await supabase
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

    const { error: insertError } = await supabase
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



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
    const { lectureId, lectureContent } = await req.json();
    
    if (!lectureId || !lectureContent) {
      throw new Error('Missing required parameters: lectureId or lectureContent');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get language settings from AI config and lecture
    const { data: aiConfig } = await supabaseClient
      .from('lecture_ai_configs')
      .select('content_language')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    const { data: lecture } = await supabaseClient
      .from('lectures')
      .select('original_language')
      .eq('id', lectureId)
      .single();

    const targetLanguage = aiConfig?.content_language || lecture?.original_language || 'English';
    console.log('Using target language:', targetLanguage);

    console.log('Generating segments structure for lecture:', lectureId);
    console.log('Content length:', lectureContent.length);

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
            content: `You are an expert at breaking down educational content into logical segments. Your task is to analyze the content and create 4-5 focused segments.

For each segment, create:
1. A concise title (max 8 words)
2. A description that follows this EXACT format:
   "Key concepts: concept1 (short context for concept1), concept2 (short context for concept2), concept3 (short context for concept3), concept4 (short context for concept4)"
   
   Rules for the description:
   - You MUST include EXACTLY 4 key concepts, no more, no less
   - Each concept MUST have a short context in parentheses
   - The context should specify HOW the concept is used or applied in this specific segment
   - Contexts should differentiate how each concept is used differently across segments
   - Start EXACTLY with "Key concepts: " followed by the concepts list
   - Use commas to separate concept entries
   - Make sure each concept is unique within the segment
   - Make each context specific and actionable

Target language: ${targetLanguage}

Example of good description format:
"Key concepts: energy reserves (geographical distribution analysis), resource accessibility (technological extraction methods), renewable potential (current infrastructure limitations), sustainability metrics (long-term viability assessment)"

Return ONLY a JSON object in this format:
{
  "segments": [
    {
      "title": "string",
      "description": "string"
    }
  ]
}`
          },
          {
            role: 'user',
            content: lectureContent
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API call failed: ${response.status} ${response.statusText}`);
    }

    const openAIResponse = await response.json();
    if (!openAIResponse.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response structure:', openAIResponse);
      throw new Error('Invalid response structure from OpenAI');
    }

    let segments;
    try {
      const rawContent = openAIResponse.choices[0].message.content;
      console.log('Raw OpenAI content:', rawContent);
      
      const parsedContent = JSON.parse(rawContent);
      console.log('Parsed content:', JSON.stringify(parsedContent, null, 2));

      if (!parsedContent.segments || !Array.isArray(parsedContent.segments)) {
        throw new Error('Response missing segments array');
      }

      parsedContent.segments.forEach((segment, index) => {
        if (!segment.title || typeof segment.title !== 'string') {
          throw new Error(`Segment ${index + 1} missing valid title`);
        }
        if (!segment.description || typeof segment.description !== 'string') {
          throw new Error(`Segment ${index + 1} missing valid description`);
        }
        // Validate description format
        if (!segment.description.startsWith('Key concepts: ')) {
          throw new Error(`Segment ${index + 1} description must start with "Key concepts: "`);
        }
        const concepts = segment.description.substring(13).split(',').map(c => c.trim());
        if (concepts.length !== 4) {
          throw new Error(`Segment ${index + 1} must have exactly 4 concepts`);
        }
        concepts.forEach((concept, conceptIndex) => {
          if (!concept.includes('(') || !concept.includes(')')) {
            throw new Error(`Concept ${conceptIndex + 1} in segment ${index + 1} must include context in parentheses`);
          }
        });
        
        // Check for duplicate concepts within the segment
        const conceptNames = concepts.map(c => c.split('(')[0].trim().toLowerCase());
        const uniqueConceptNames = new Set(conceptNames);
        if (uniqueConceptNames.size !== concepts.length) {
          throw new Error(`Segment ${index + 1} contains duplicate concepts`);
        }
      });

      segments = parsedContent.segments;
      console.log('Valid segments found:', segments.length);

    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.error('Raw content:', openAIResponse.choices[0].message.content);
      throw new Error(`Failed to parse OpenAI response: ${error.message}`);
    }

    // Delete existing segments for this lecture
    const { error: deleteError } = await supabaseClient
      .from('lecture_segments')
      .delete()
      .eq('lecture_id', lectureId);

    if (deleteError) {
      console.error('Error deleting existing segments:', deleteError);
      throw deleteError;
    }

    // Prepare segments for insertion with proper mapping
    const segmentsToInsert = segments.map((segment, index) => ({
      lecture_id: lectureId,
      sequence_number: index + 1,
      title: segment.title,
      segment_description: segment.description
    }));

    console.log('Inserting segments:', JSON.stringify(segmentsToInsert, null, 2));

    // Insert new segments
    const { data: insertedSegments, error: insertError } = await supabaseClient
      .from('lecture_segments')
      .insert(segmentsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting segments:', insertError);
      throw insertError;
    }

    console.log('Successfully inserted segments:', insertedSegments);

    return new Response(
      JSON.stringify({ segments: insertedSegments }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in generate-segments-structure:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});


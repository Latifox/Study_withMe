
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

    // Initialize Supabase client with environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

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
            content: `You are an expert at breaking down educational content into logical segments. Your task is to analyze the content and create 5-7 focused segments (NEVER create fewer than 5 segments).

For each segment, create:
1. A concise title (max 5 words)
2. A description that follows this EXACT format:
   "Key concepts: concept1 (aspect1, aspect2, aspect3), concept2 (aspect1, aspect2), concept3 (aspect1, aspect2)"

Rules for the description:
- Each concept MUST have at least 2 specific, detailed aspects listed in parentheses
- List 2-4 key concepts per segment
- Concepts MUST be unique across all segments
- Start directly with "Key concepts:"
- Use commas to separate concept entries
- Aspects should be specific learning points, not generic descriptions
- Do not provide definitions in the aspects, only list what to explore

Target language: ${targetLanguage}

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

      // Validate minimum number of segments
      if (parsedContent.segments.length < 5) {
        throw new Error('Less than 5 segments generated. Required minimum is 5 segments.');
      }

      // Basic validation of segments
      const conceptsSet = new Set();
      parsedContent.segments.forEach((segment: any, index: number) => {
        if (!segment.title || typeof segment.title !== 'string') {
          throw new Error(`Segment ${index + 1} missing valid title`);
        }
        if (segment.title.split(' ').length > 5) {
          throw new Error(`Segment ${index + 1} title exceeds 5 words`);
        }
        if (!segment.description || typeof segment.description !== 'string') {
          throw new Error(`Segment ${index + 1} missing valid description`);
        }
        
        // Ensure description starts with "Key concepts:"
        if (!segment.description.startsWith('Key concepts:')) {
          throw new Error(`Segment ${index + 1} description must start with "Key concepts:"`);
        }
        
        // Basic format check for concepts and aspects
        const conceptsText = segment.description.replace('Key concepts:', '').trim();
        const concepts = conceptsText.split(',').map((c: string) => c.trim());
        
        if (concepts.length < 2 || concepts.length > 4) {
          throw new Error(`Segment ${index + 1} must have between 2 and 4 concepts`);
        }

        // Check each concept has aspects in parentheses and validate uniqueness
        concepts.forEach((concept: string, conceptIndex: number) => {
          const conceptMatch = concept.match(/^(.+?)\s*\((.*?)\)$/);
          if (!conceptMatch) {
            throw new Error(`Concept ${conceptIndex + 1} in segment ${index + 1} must include aspects in parentheses`);
          }

          const conceptName = conceptMatch[1].trim().toLowerCase();
          if (conceptsSet.has(conceptName)) {
            throw new Error(`Duplicate concept "${conceptName}" found in segment ${index + 1}`);
          }
          conceptsSet.add(conceptName);

          const aspects = conceptMatch[2].split(',').map(a => a.trim());
          if (aspects.length < 2) {
            throw new Error(`Concept ${conceptIndex + 1} in segment ${index + 1} must have at least 2 aspects`);
          }
        });
      });

      segments = parsedContent.segments;
      console.log('Valid segments found:', segments.length);

    } catch (error: any) {
      console.error('Error parsing or validating OpenAI response:', error);
      console.error('Raw content:', openAIResponse.choices[0].message.content);
      throw new Error(`Failed to parse or validate OpenAI response: ${error.message}`);
    }

    // Delete existing segments
    const { error: deleteError } = await supabaseClient
      .from('lecture_segments')
      .delete()
      .eq('lecture_id', lectureId);

    if (deleteError) {
      console.error('Error deleting existing segments:', deleteError);
      throw deleteError;
    }

    // Prepare segments for insertion
    const segmentsToInsert = segments.map((segment: any, index: number) => ({
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

  } catch (error: any) {
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

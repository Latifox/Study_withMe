
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initSupabaseClient, getExistingContent, getLectureContent, getAIConfig, saveSegmentContent } from "./db.ts";
import { validateContent } from "./validator.ts";
import { generatePrompt, generateContent } from "./generator.ts";
import { GeneratedContent, SegmentRequest } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { lectureId, segmentNumber }: SegmentRequest = await req.json();
    
    if (!lectureId || typeof segmentNumber !== 'number') {
      throw new Error('Invalid request parameters');
    }

    console.log('Processing request for lecture:', lectureId, 'segment:', segmentNumber);
    
    const supabaseClient = initSupabaseClient();

    // Get lecture content and segment info
    const lectureContent = await getLectureContent(supabaseClient, lectureId);
    console.log('Lecture content length:', lectureContent.length);
    
    // Get segment information including description
    const { data: segment, error: segmentError } = await supabaseClient
      .from('lecture_segments')
      .select('title, segment_description')
      .eq('lecture_id', lectureId)
      .eq('sequence_number', segmentNumber)
      .maybeSingle();

    if (segmentError) {
      console.error('Error fetching segment:', segmentError);
      throw new Error('Failed to fetch segment information');
    }

    if (!segment) {
      throw new Error(`No segment found for lecture ${lectureId} number ${segmentNumber}`);
    }

    console.log('Generating content for segment:', segment.title);

    // Check for existing content first
    const existingContent = await getExistingContent(supabaseClient, lectureId, segmentNumber);

    if (existingContent) {
      console.log('Content already exists, returning existing content');
      return new Response(
        JSON.stringify({ segmentContent: existingContent }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI config
    const aiConfig = await getAIConfig(supabaseClient, lectureId);
    console.log('Using AI config:', JSON.stringify(aiConfig, null, 2));

    // Set up timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const prompt = generatePrompt(segment.title, segment.segment_description, lectureContent, aiConfig);
      console.log('Generated prompt length:', prompt.length);
      
      const responseContent = await generateContent(prompt);
      console.log('Received response from OpenAI');
      
      const content = JSON.parse(responseContent) as GeneratedContent;
      console.log('Successfully parsed content');
      
      validateContent(content);
      console.log('Content validation passed');
      
      const segmentContent = await saveSegmentContent(
        supabaseClient,
        lectureId,
        segmentNumber,
        content
      );
      console.log('Successfully saved segment content');

      clearTimeout(timeoutId);

      return new Response(
        JSON.stringify({ segmentContent }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out while generating content');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

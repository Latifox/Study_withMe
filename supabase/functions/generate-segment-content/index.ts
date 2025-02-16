
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initSupabaseClient, getStoryStructure, getExistingContent, getLectureContent, getAIConfig, saveSegmentContent } from "./db.ts";
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
    
    const supabaseClient = initSupabaseClient();

    // Get lecture content and segment info
    const lectureContent = await getLectureContent(supabaseClient, lectureId);
    
    // Get segment information including description
    const { data: segment, error: segmentError } = await supabaseClient
      .from('lecture_segments')
      .select('title, segment_description')
      .eq('lecture_id', lectureId)
      .eq('sequence_number', segmentNumber)
      .single();

    if (segmentError || !segment) {
      console.error('Error fetching segment:', segmentError);
      throw new Error('Failed to fetch segment information');
    }

    console.log('Generating content for segment:', segment.title);

    // Check for existing content first
    const storyStructure = await getStoryStructure(supabaseClient, lectureId);
    const existingContent = await getExistingContent(supabaseClient, storyStructure.id, segmentNumber);

    if (existingContent) {
      console.log('Content already exists, returning existing content');
      return new Response(
        JSON.stringify({ segmentContent: existingContent }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI config
    const aiConfig = await getAIConfig(supabaseClient, lectureId);

    console.log('Calling GPT for content generation...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const prompt = generatePrompt(segment.title, segment.segment_description, lectureContent, aiConfig);
      const responseContent = await generateContent(prompt);
      
      console.log('Successfully received GPT response');
      
      const content = JSON.parse(responseContent) as GeneratedContent;
      
      validateContent(content);
      
      const segmentContent = await saveSegmentContent(
        supabaseClient,
        storyStructure.id,
        segmentNumber,
        content
      );

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

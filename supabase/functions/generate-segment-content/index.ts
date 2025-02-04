import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initSupabaseClient, getStoryStructure, getExistingContent, getLectureContent, saveSegmentContent } from "./db.ts";
import { validateContent } from "./validator.ts";
import { generatePrompt, generateContent, cleanGeneratedContent } from "./generator.ts";
import { GeneratedContent, SegmentRequest } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, segmentNumber, segmentTitle }: SegmentRequest = await req.json();
    console.log('Generating content for:', { lectureId, segmentNumber, segmentTitle });

    const supabaseClient = initSupabaseClient();

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

    // Fetch previous segments' content
    const previousSegments = [];
    for (let i = 1; i < segmentNumber; i++) {
      const prevContent = await getExistingContent(supabaseClient, storyStructure.id, i);
      if (prevContent) {
        previousSegments.push({
          title: storyStructure[`segment_${i}_title`],
          ...prevContent
        });
      }
    }

    // Fetch lecture content and AI config
    const [lecture, aiConfig] = await Promise.all([
      getLectureContent(supabaseClient, lectureId),
      supabaseClient
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .maybeSingle()
    ]);

    // Use default AI config if none exists
    const config = aiConfig.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      custom_instructions: ''
    };

    console.log('Calling OpenAI API for content generation...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

    try {
      const prompt = generatePrompt(segmentTitle, lecture.content, config, previousSegments);
      const responseContent = await generateContent(prompt);
      
      console.log('Successfully received OpenAI response');
      console.log('Raw response content:', responseContent);
      
      // Clean and parse the content
      const cleanContent = cleanGeneratedContent(responseContent);
      console.log('Cleaned content:', cleanContent);
      
      const content = JSON.parse(cleanContent) as GeneratedContent;
      
      // Validate the content structure
      validateContent(content);
      
      // Save content to database
      const segmentContent = await saveSegmentContent(
        supabaseClient,
        storyStructure.id,
        segmentNumber,
        content
      );

      return new Response(
        JSON.stringify({ segmentContent }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('Request timed out while generating content');
        throw new Error('Request timed out while generating content');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
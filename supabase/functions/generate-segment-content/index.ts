
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initSupabaseClient, getStoryStructure, getExistingContent, getLectureChunks, getAIConfig, saveSegmentContent } from "./db.ts";
import { validateContent } from "./validator.ts";
import { generatePrompt, generateContent } from "./generator.ts";
import { GeneratedContent, SegmentRequest } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

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
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Fetch the lecture chunks for this segment
    const chunkPair = await getLectureChunks(supabaseClient, lectureId, segmentNumber);
    console.log('Retrieved chunks for segment:', segmentNumber);

    // Get AI config
    const aiConfig = await getAIConfig(supabaseClient, lectureId);

    console.log('Calling OpenAI API for content generation...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

    try {
      const prompt = generatePrompt(segmentTitle, chunkPair, aiConfig);
      const responseContent = await generateContent(prompt);
      
      console.log('Successfully received OpenAI response');
      console.log('Raw response content:', responseContent);
      
      const content = JSON.parse(responseContent) as GeneratedContent;
      
      // Validate the content structure
      validateContent(content);
      
      // Save content to database
      const segmentContent = await saveSegmentContent(
        supabaseClient,
        storyStructure.id,
        segmentNumber,
        content
      );

      clearTimeout(timeoutId);

      return new Response(
        JSON.stringify({ segmentContent }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
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

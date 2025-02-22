
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initSupabaseClient, getExistingContent, getLectureContent, getAIConfig, saveSegmentContent } from "./db.ts";
import { validateContent } from "./validator.ts";
import { generatePrompt, generateContent } from "./generator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIMEOUT = 50000; // 50 second timeout

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const { lectureId, segmentNumber } = await req.json();
    
    if (!lectureId || typeof segmentNumber !== 'number') {
      throw new Error('Invalid request parameters');
    }

    console.log('Processing request for lecture:', lectureId, 'segment:', segmentNumber);
    
    const supabaseClient = initSupabaseClient();

    // Get lecture content and segment info
    const { content: lectureContent, language } = await getLectureContent(supabaseClient, lectureId);
    console.log('Lecture content length:', lectureContent.length, 'Language:', language);
    
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
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({ segmentContent: existingContent }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI config
    const aiConfig = await getAIConfig(supabaseClient, lectureId);
    console.log('Using AI config:', JSON.stringify(aiConfig, null, 2));

    try {
      const prompt = generatePrompt(segment.title, segment.segment_description, lectureContent, aiConfig);
      console.log('Generated prompt length:', prompt.length);
      
      const responseContent = await generateContent(prompt);
      console.log('Received response from OpenAI');
      
      const content = JSON.parse(responseContent);
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
      if (error.message.includes('Theory slide')) {
        console.log('Retrying content generation with emphasis on word count...');
        const retryPrompt = generatePrompt(segment.title, segment.segment_description, lectureContent, {
          ...aiConfig,
          custom_instructions: `${aiConfig.custom_instructions}\nCRITICAL: Each theory slide MUST contain AT LEAST 400 words and NO MORE than 600 words. This is a strict requirement.`
        });
        
        const retryContent = await generateContent(retryPrompt);
        const content = JSON.parse(retryContent);
        validateContent(content);
        
        const segmentContent = await saveSegmentContent(
          supabaseClient,
          lectureId,
          segmentNumber,
          content
        );
        
        clearTimeout(timeoutId);
        return new Response(
          JSON.stringify({ segmentContent }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: error.status || 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

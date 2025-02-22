
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { getLectureContent, saveSegmentContent } from "./db.ts";
import { generatePrompt, generateContent } from "./generator.ts";
import { validateConfig } from "./validator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, segmentNumber } = await req.json();
    console.log(`Processing request for lecture ${lectureId}, segment ${segmentNumber}`);

    if (!lectureId || !segmentNumber) {
      throw new Error('Missing required parameters');
    }

    // Get lecture content and AI config
    const { content: lectureContent, segment, config } = await getLectureContent(
      lectureId,
      segmentNumber
    );

    if (!segment || !lectureContent) {
      throw new Error('Could not find lecture content or segment');
    }

    console.log('Validating AI configuration...');
    const validatedConfig = validateConfig(config);
    
    console.log('Generating prompt...');
    const prompt = generatePrompt(
      segment.title,
      segment.segment_description,
      lectureContent,
      validatedConfig
    );

    console.log('Generating content...');
    const content = await generateContent(prompt);

    console.log('Saving generated content...');
    await saveSegmentContent(lectureId, segmentNumber, JSON.parse(content));

    console.log('Content generation completed successfully');
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-segment-content:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

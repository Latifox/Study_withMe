
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Database } from '../db.types.ts';
import { generator } from './generator.ts';
import { validator } from './validator.ts';
import { db } from './db.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { lectureId, segmentNumber } = await req.json();
    console.log('Received request for lecture:', lectureId, 'segment:', segmentNumber);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);
    const dbClient = new db(supabaseClient);

    // Fetch the segment and lecture content
    const segment = await dbClient.getSegmentDetails(lectureId, segmentNumber);
    if (!segment) {
      throw new Error('Segment not found');
    }

    // Generate content based on the segment details
    const generatedContent = await generator.generateContent(segment);
    const validatedContent = validator.validateContent(generatedContent);

    // Save content to database
    await dbClient.saveSegmentContent(lectureId, segmentNumber, validatedContent);

    return new Response(
      JSON.stringify({ success: true, content: validatedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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

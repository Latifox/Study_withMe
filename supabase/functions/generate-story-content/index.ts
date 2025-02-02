import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId } = await req.json();
    console.log('Generating story content for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw lectureError;
    }

    // Generate story content based on lecture content
    const storyContent = {
      segments: Array.from({ length: 10 }, (_, index) => ({
        id: `segment-${index + 1}`,
        title: `Section ${index + 1}`,
        slides: [
          {
            id: `slide-${index + 1}-1`,
            content: `# Section ${index + 1} - Part 1\n\nThis is the first slide of section ${index + 1}. The content will be based on the lecture material.`
          },
          {
            id: `slide-${index + 1}-2`,
            content: `# Section ${index + 1} - Part 2\n\nThis is the second slide of section ${index + 1}. The content will be based on the lecture material.`
          }
        ],
        questions: [
          {
            id: `question-${index + 1}-1`,
            type: "multiple_choice",
            question: `Question 1 for Section ${index + 1}?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: "Option A",
            explanation: "This is the explanation for the correct answer."
          },
          {
            id: `question-${index + 1}-2`,
            type: "multiple_choice",
            question: `Question 2 for Section ${index + 1}?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: "Option B",
            explanation: "This is the explanation for the correct answer."
          }
        ]
      }))
    };

    console.log('Successfully generated story content');

    return new Response(
      JSON.stringify({ storyContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-story-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
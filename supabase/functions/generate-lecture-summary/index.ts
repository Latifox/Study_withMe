
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabaseClient = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, part, lectureContent } = await req.json();

    console.log(`Generating ${part} summary for lecture ${lectureId}`);
    
    if (!lectureId) {
      throw new Error('Lecture ID is required');
    }

    // Get lecture details if content wasn't provided
    let lecture;
    if (!lectureContent) {
      const { data, error } = await supabaseClient
        .from('lectures')
        .select('*')
        .eq('id', lectureId)
        .single();

      if (error) {
        console.error('Error fetching lecture:', error);
        throw error;
      }

      lecture = data;
    }

    // Get AI config for the lecture
    const { data: aiConfig, error: aiConfigError } = await supabaseClient
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .single();

    if (aiConfigError) {
      console.error('Error fetching AI config:', aiConfigError);
      throw aiConfigError;
    }

    console.log('AI config:', aiConfig);

    // Use passed content or fallback to fetched content
    const contentToAnalyze = lectureContent || lecture?.content;
    
    if (!contentToAnalyze) {
      throw new Error('No lecture content available to analyze');
    }

    let systemPrompt = '';
    let userPrompt = contentToAnalyze;

    if (part === 'highlights') {
      systemPrompt = `You are a helpful AI that analyzes lecture content and organizes it into clear sections. Please analyze the following lecture and provide a structured response with these sections:

Structure: Explain how the lecture content is organized.
Key Concepts: List and explain the main concepts covered.
Main Ideas: Summarize the principal arguments or points.
Important Quotes: Include relevant quotes from the lecture.
Relationships: Describe how different concepts connect.
Supporting Evidence: Note any evidence, examples, or data used.

Keep each section clear and concise. Use the lecture's original language where appropriate.

Temperature: ${aiConfig.temperature}
Creativity Level: ${aiConfig.creativity_level}
Detail Level: ${aiConfig.detail_level}`;
    } else {
      systemPrompt = `You are a helpful AI that generates comprehensive lecture summaries. Please analyze the provided lecture content and create a detailed summary that captures all key points, arguments, and examples.

Make the summary clear, well-structured, and thorough while maintaining readability. Use original text where appropriate.

Temperature: ${aiConfig.temperature}
Creativity Level: ${aiConfig.creativity_level}
Detail Level: ${aiConfig.detail_level}`;
    }

    console.log('Sending request to OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: aiConfig.temperature,
      }),
    });

    const completion = await response.json();
    console.log('Received response from OpenAI');

    if (!completion.choices || completion.choices.length === 0) {
      console.error('Invalid response from OpenAI:', completion);
      throw new Error('Failed to generate summary');
    }

    const generatedContent = completion.choices[0].message.content;
    console.log('Generated content:', generatedContent);

    if (part === 'highlights') {
      // Parse the sections from the generated content
      const sections: Record<string, string> = {};
      const sectionRegex = /^(Structure|Key Concepts|Main Ideas|Important Quotes|Relationships|Supporting Evidence):\s*([\s\S]*?)(?=\n\n(?:Structure|Key Concepts|Main Ideas|Important Quotes|Relationships|Supporting Evidence):|$)/gm;

      let match;
      while ((match = sectionRegex.exec(generatedContent)) !== null) {
        sections[match[1].toLowerCase().replace(' ', '_')] = match[2].trim();
      }

      console.log('Parsed sections:', sections);

      // Store the highlights in the database using upsert
      const { error: upsertError } = await supabaseClient
        .from('lecture_highlights')
        .upsert({
          lecture_id: lectureId,
          ...sections,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        console.error('Error storing highlights:', upsertError);
        throw new Error('Failed to store highlights');
      }

      return new Response(JSON.stringify({ content: sections }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // For full summary, store and return the complete content using upsert
      const { error: upsertError } = await supabaseClient
        .from('lecture_highlights')
        .upsert({
          lecture_id: lectureId,
          full_content: generatedContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        console.error('Error storing full summary:', upsertError);
        throw new Error('Failed to store full summary');
      }

      return new Response(JSON.stringify({ content: { full_content: generatedContent } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

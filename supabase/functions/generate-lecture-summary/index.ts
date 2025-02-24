
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, part = 'highlights' } = await req.json();
    console.log(`Processing ${part} for lecture ID: ${lectureId}`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content and AI configuration
    const { data: lecture } = await supabaseClient
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .single();

    if (!lecture || !lecture.content) {
      throw new Error('Lecture content not found');
    }

    const { data: aiConfig } = await supabaseClient
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .single();

    console.log('AI Config:', aiConfig);

    // Prepare the system prompt based on the part requested
    const systemPrompt = part === 'highlights' 
      ? `You are an expert at analyzing academic content and extracting key information. Format your response in markdown.
         Analyze the following lecture content and provide:
         1. Structure: Overall organization and flow of the content
         2. Key Concepts: Main theoretical or practical concepts introduced
         3. Main Ideas: Core arguments or central themes
         4. Important Quotes: Notable or significant statements
         5. Relationships: Connections between different concepts or ideas
         6. Supporting Evidence: Examples, data, or references used
         
         Use markdown formatting for better readability.`
      : `You are an expert at creating comprehensive lecture summaries. Create a detailed summary of the lecture that covers all major points, arguments, and examples. Use markdown formatting for better readability.`;

    // Make OpenAI API request
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: lecture.content }
        ],
        temperature: aiConfig?.temperature ?? 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.json();
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate summary');
    }

    const completion = await openAIResponse.json();
    const generatedContent = completion.choices[0].message.content;
    console.log('Generated content length:', generatedContent.length);

    // Parse the response for highlights
    if (part === 'highlights') {
      const sections = {
        structure: '',
        keyConcepts: '',
        mainIdeas: '',
        importantQuotes: '',
        relationships: '',
        supportingEvidence: '',
      };

      // Extract sections using markdown headers
      const content = generatedContent.split('\n');
      let currentSection = '';

      for (const line of content) {
        if (line.toLowerCase().includes('structure:')) {
          currentSection = 'structure';
          continue;
        } else if (line.toLowerCase().includes('key concepts:')) {
          currentSection = 'keyConcepts';
          continue;
        } else if (line.toLowerCase().includes('main ideas:')) {
          currentSection = 'mainIdeas';
          continue;
        } else if (line.toLowerCase().includes('important quotes:')) {
          currentSection = 'importantQuotes';
          continue;
        } else if (line.toLowerCase().includes('relationships:')) {
          currentSection = 'relationships';
          continue;
        } else if (line.toLowerCase().includes('supporting evidence:')) {
          currentSection = 'supportingEvidence';
          continue;
        }

        if (currentSection && line.trim()) {
          sections[currentSection] += line + '\n';
        }
      }

      // Update or insert highlights in the database
      const { data: existingHighlights } = await supabaseClient
        .from('lecture_highlights')
        .select('*')
        .eq('lecture_id', lectureId)
        .maybeSingle();

      if (existingHighlights) {
        await supabaseClient
          .from('lecture_highlights')
          .update({
            structure: sections.structure.trim(),
            key_concepts: sections.keyConcepts.trim(),
            main_ideas: sections.mainIdeas.trim(),
            important_quotes: sections.importantQuotes.trim(),
            relationships: sections.relationships.trim(),
            supporting_evidence: sections.supportingEvidence.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('lecture_id', lectureId);
      } else {
        await supabaseClient
          .from('lecture_highlights')
          .insert({
            lecture_id: lectureId,
            structure: sections.structure.trim(),
            key_concepts: sections.keyConcepts.trim(),
            main_ideas: sections.mainIdeas.trim(),
            important_quotes: sections.importantQuotes.trim(),
            relationships: sections.relationships.trim(),
            supporting_evidence: sections.supportingEvidence.trim(),
          });
      }

      console.log('Highlights saved successfully');
      return new Response(JSON.stringify({ sections }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Handle full summary
      await supabaseClient
        .from('lecture_highlights')
        .upsert({
          lecture_id: lectureId,
          full_content: generatedContent,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'lecture_id'
        });

      console.log('Full summary saved successfully');
      return new Response(JSON.stringify({ content: generatedContent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in generate-lecture-summary:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

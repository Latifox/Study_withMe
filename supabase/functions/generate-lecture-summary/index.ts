
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
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content, title')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture?.content) {
      throw new Error('Lecture content not found');
    }

    const { data: aiConfig } = await supabaseClient
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .single();

    console.log('AI Config:', aiConfig);

    const temperature = aiConfig?.temperature ?? 0.7;
    const content = lecture.content;

    // Prepare the system prompt based on the part requested
    const systemPrompt = part === 'highlights' 
      ? `You are an expert academic content analyzer. Your task is to analyze the provided lecture content and generate comprehensive highlights in the following six categories. Format each section clearly with Markdown headers:

1. Structure: Analyze and describe the overall organization and flow of the content.
2. Key Concepts: Identify and explain the main theoretical or practical concepts introduced.
3. Main Ideas: Extract and summarize the core arguments or central themes.
4. Important Quotes: Select and highlight notable or significant statements from the content.
5. Relationships: Identify connections between different concepts or ideas presented.
6. Supporting Evidence: List examples, data, or references used to support the main points.

Present each section with a clear heading. Be thorough and specific in your analysis.`
      : `You are an expert at creating comprehensive lecture summaries. Create a detailed, well-structured summary of this lecture that covers all major points, arguments, and examples. Use markdown formatting for better readability. Focus solely on the lecture content provided, without any pre-existing assumptions or structures.

Important guidelines:
- Start with a brief overview
- Break down main topics into clear sections
- Use bullet points for key details
- Include relevant examples and explanations
- Maintain a logical flow throughout the summary`;

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
          { role: 'user', content }
        ],
        temperature,
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

    if (part === 'highlights') {
      const sections = {
        structure: '',
        key_concepts: '',
        main_ideas: '',
        important_quotes: '',
        relationships: '',
        supporting_evidence: '',
      };

      // Extract sections using regex patterns
      const contentLines = generatedContent.split('\n');
      let currentSection = '';
      
      for (const line of contentLines) {
        const lowercaseLine = line.toLowerCase();
        
        if (lowercaseLine.includes('structure:') || lowercaseLine.includes('# structure')) {
          currentSection = 'structure';
          continue;
        } else if (lowercaseLine.includes('key concepts:') || lowercaseLine.includes('# key concepts')) {
          currentSection = 'key_concepts';
          continue;
        } else if (lowercaseLine.includes('main ideas:') || lowercaseLine.includes('# main ideas')) {
          currentSection = 'main_ideas';
          continue;
        } else if (lowercaseLine.includes('important quotes:') || lowercaseLine.includes('# important quotes')) {
          currentSection = 'important_quotes';
          continue;
        } else if (lowercaseLine.includes('relationships:') || lowercaseLine.includes('# relationships')) {
          currentSection = 'relationships';
          continue;
        } else if (lowercaseLine.includes('supporting evidence:') || lowercaseLine.includes('# supporting evidence')) {
          currentSection = 'supporting_evidence';
          continue;
        }

        if (currentSection && line.trim()) {
          sections[currentSection] += line + '\n';
        }
      }

      // Clean up sections and ensure none are empty
      Object.keys(sections).forEach((key) => {
        sections[key] = sections[key].trim() || 'Content for this section is being generated...';
      });

      console.log('Processed sections:', sections);

      // Update or insert highlights in the database
      const { data: existingHighlights } = await supabaseClient
        .from('lecture_highlights')
        .select('*')
        .eq('lecture_id', lectureId)
        .maybeSingle();

      if (existingHighlights) {
        const { error: updateError } = await supabaseClient
          .from('lecture_highlights')
          .update({
            structure: sections.structure,
            key_concepts: sections.key_concepts,
            main_ideas: sections.main_ideas,
            important_quotes: sections.important_quotes,
            relationships: sections.relationships,
            supporting_evidence: sections.supporting_evidence,
            updated_at: new Date().toISOString(),
          })
          .eq('lecture_id', lectureId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabaseClient
          .from('lecture_highlights')
          .insert({
            lecture_id: lectureId,
            structure: sections.structure,
            key_concepts: sections.key_concepts,
            main_ideas: sections.main_ideas,
            important_quotes: sections.important_quotes,
            relationships: sections.relationships,
            supporting_evidence: sections.supporting_evidence,
          });

        if (insertError) throw insertError;
      }

      return new Response(JSON.stringify({ sections }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Handle full summary
      const { error: updateError } = await supabaseClient
        .from('lecture_highlights')
        .upsert({
          lecture_id: lectureId,
          full_content: generatedContent,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'lecture_id'
        });

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ content: { full_content: generatedContent } }), {
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

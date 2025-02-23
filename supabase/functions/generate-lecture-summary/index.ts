
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, part } = await req.json();
    console.log('Processing request for lecture:', lectureId, 'part:', part);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the AI configuration for this lecture
    const { data: aiConfig, error: aiConfigError } = await supabase
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (aiConfigError) {
      console.error('Error fetching AI config:', aiConfigError);
      throw new Error('Failed to fetch AI configuration');
    }

    // First check if we already have highlights for this lecture
    const { data: existingHighlights } = await supabase
      .from('lecture_highlights')
      .select('*')
      .eq('lecture_id', lectureId)
      .single();

    if (existingHighlights) {
      console.log('Found existing highlights');
      if (part === 'part1') {
        return new Response(JSON.stringify({
          content: {
            structure: existingHighlights.structure || '',
            keyConcepts: existingHighlights.key_concepts || '',
            mainIdeas: existingHighlights.main_ideas || ''
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (part === 'part2') {
        return new Response(JSON.stringify({
          content: {
            importantQuotes: existingHighlights.important_quotes || '',
            relationships: existingHighlights.relationships || '',
            supportingEvidence: existingHighlights.supporting_evidence || ''
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // If no existing highlights, fetch lecture content and generate new ones
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .maybeSingle();

    if (lectureError || !lecture) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    console.log('Successfully fetched lecture content');

    let systemPrompt;
    
    if (part === 'part1') {
      systemPrompt = `You are an expert educational content analyzer. Your task is to analyze lecture content and provide a detailed breakdown in three specific sections. Each section should be preceded by its header in markdown format (##). Follow this exact structure and formatting guidelines:

      ## Structure
      - Use bullet points to outline the main sections
      - Highlight **key sections** in bold
      - Use > blockquotes for important structural notes
      - Include nested lists for subsections

      ## Key Concepts
      - List each concept with a brief description
      - Use **bold text** for concept names
      - Include > blockquotes for definitions
      - Create nested lists for related subconcepts
      - Use --- for separating major concepts

      ## Main Ideas
      - Present each main idea as a bullet point
      - Use **bold text** for emphasis on critical points
      - Include > blockquotes for significant statements
      - Create numbered lists for sequential ideas
      - Use nested points for supporting details

      Important: 
      1. Use rich markdown formatting consistently
      2. Ensure proper nesting of lists
      3. Utilize bold text for emphasis
      4. Include relevant blockquotes
      5. Maintain clear hierarchical structure
      
      ${aiConfig?.custom_instructions ? `Additional instructions: ${aiConfig.custom_instructions}` : ''}
      ${aiConfig?.content_language ? `Please provide the content in: ${aiConfig.content_language}` : ''}`;
    } else if (part === 'part2') {
      systemPrompt = `You are an expert educational content analyzer. Your task is to analyze lecture content and provide a detailed breakdown in three specific sections. Each section should be preceded by its header in markdown format (##). Follow this exact structure and formatting guidelines:

      ## Important Quotes
      - Present each quote in a > blockquote format
      - Add **bold context** before each quote
      - Include bullet points for analysis
      - Use --- to separate major quotes
      - Add nested points for quote interpretation

      ## Relationships
      - Use bullet points for each relationship
      - Highlight **connected concepts** in bold
      - Include > blockquotes for key insights
      - Create nested lists for detailed connections
      - Use numbered lists for sequential relationships

      ## Supporting Evidence
      - List each piece of evidence with bullets
      - Use **bold text** for key findings
      - Include > blockquotes for direct references
      - Create nested lists for detailed analysis
      - Use --- to separate major evidence sections

      Important:
      1. Use rich markdown formatting consistently
      2. Ensure proper nesting of lists
      3. Utilize bold text for emphasis
      4. Include relevant blockquotes
      5. Maintain clear hierarchical structure
      
      ${aiConfig?.custom_instructions ? `Additional instructions: ${aiConfig.custom_instructions}` : ''}
      ${aiConfig?.content_language ? `Please provide the content in: ${aiConfig.content_language}` : ''}`;
    } else {
      throw new Error('Invalid part specified');
    }

    userPrompt = `Analyze this lecture content and provide a detailed analysis with rich markdown formatting following the specified structure. Make sure to use bullet points, numbered lists, bold text, and blockquotes appropriately:\n\n${lecture.content}`;

    console.log(`Sending request to OpenAI for ${part}`);

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
          { role: 'user', content: userPrompt }
        ],
        temperature: aiConfig?.temperature ?? 0.7,
        presence_penalty: aiConfig?.creativity_level ?? 0.5,
        frequency_penalty: aiConfig?.detail_level ?? 0.6,
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate content from OpenAI');
    }

    const data = await openAIResponse.json();
    console.log('Received response from OpenAI');

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response format:', JSON.stringify(data));
      throw new Error('Invalid response format from OpenAI');
    }

    const content = data.choices[0].message.content.trim();

    // Parse the markdown content into sections
    const sections = content.split('##')
      .filter(Boolean)
      .map(s => s.trim());

    console.log(`Found ${sections.length} sections in the response`);

    // Validate that we have exactly 3 sections
    if (sections.length !== 3) {
      console.error('Invalid number of sections:', sections.length);
      throw new Error('Invalid number of sections in response');
    }

    let response;
    let dbUpdate;

    if (part === 'part1') {
      response = {
        content: {
          structure: sections[0],
          keyConcepts: sections[1],
          mainIdeas: sections[2]
        }
      };

      dbUpdate = {
        lecture_id: lectureId,
        structure: sections[0],
        key_concepts: sections[1],
        main_ideas: sections[2],
      };

    } else if (part === 'part2') {
      response = {
        content: {
          importantQuotes: sections[0],
          relationships: sections[1],
          supportingEvidence: sections[2]
        }
      };

      dbUpdate = {
        important_quotes: sections[0],
        relationships: sections[1],
        supporting_evidence: sections[2]
      };
    }

    // For part1, create new record. For part2, update existing record
    if (part === 'part1') {
      const { error: insertError } = await supabase
        .from('lecture_highlights')
        .upsert(dbUpdate);

      if (insertError) {
        console.error('Error inserting highlights:', insertError);
        throw new Error('Failed to store highlights in database');
      }
    } else {
      const { error: updateError } = await supabase
        .from('lecture_highlights')
        .update(dbUpdate)
        .eq('lecture_id', lectureId);

      if (updateError) {
        console.error('Error updating highlights:', updateError);
        throw new Error('Failed to update highlights in database');
      }
    }

    console.log('Successfully processed and stored content for', part);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-lecture-summary:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check the function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

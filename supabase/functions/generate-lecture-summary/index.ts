import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId } = await req.json();
    console.log('Generating detailed summary for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content and AI config
    const [{ data: lecture, error: lectureError }, { data: config }] = await Promise.all([
      supabaseClient
        .from('lectures')
        .select('content')
        .eq('id', lectureId)
        .single(),
      supabaseClient
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .single()
    ]);

    if (lectureError || !lecture?.content) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    const aiConfig = config || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      custom_instructions: ''
    };

    console.log('Fetched lecture content and AI config, generating comprehensive summary...');

    const systemMessage = `You are an expert educational content summarizer. Create a comprehensive, well-structured summary of the lecture content. 
    
    Adjust your output based on these parameters:
    - Creativity Level: ${aiConfig.creativity_level} (higher means more creative and unique perspectives)
    - Detail Level: ${aiConfig.detail_level} (higher means more comprehensive explanations)
    
    ${aiConfig.custom_instructions ? `Additional instructions:\n${aiConfig.custom_instructions}\n\n` : ''}
    
    Follow these guidelines:
    1. Maintain the EXACT SAME LANGUAGE as the input text (if Spanish, write in Spanish, if French, write in French, etc.)
    2. Structure the summary into these specific sections, using Markdown formatting:

    # Structure
    - Outline the organizational structure of the content
    - Identify major sections and subsections
    - Note any patterns in how information is presented
    - Highlight the flow of ideas

    # Key Concepts
    - Break down 4-6 important concepts
    - Include clear definitions
    - Use examples where relevant
    - Highlight important terms in **bold**

    # Main Ideas
    - List the central arguments or themes
    - Explain core principles
    - Identify key takeaways
    - Connect to broader context

    # Important Quotes
    - Select 2-3 significant quotes
    - Use proper ">" quote formatting
    - Add brief context for each quote
    - Attribute quotes when possible

    # Relationships and Connections
    - Identify links between concepts
    - Show how ideas build on each other
    - Note external connections
    - Highlight cause-effect relationships

    # Supporting Evidence & Examples
    - List key examples used
    - Describe supporting evidence
    - Include relevant data or statistics
    - Note case studies or illustrations

    # Full Content
    Provide a detailed, comprehensive summary of the entire lecture content, including:
    - In-depth explanations of all concepts
    - Extended examples and applications
    - Detailed analysis of important points
    - Connection between different topics
    - Study recommendations and practical implications

    Make each section informative yet concise. Use proper Markdown formatting throughout.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: lecture.content
          }
        ],
        temperature: aiConfig.temperature,
        max_tokens: 2500,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', openaiResponse.status);
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error details:', errorText);
      
      if (openaiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a few moments.' }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: `OpenAI API error: ${openaiResponse.status}`,
          details: 'Please try again in a few moments or contact support if the issue persists.'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await openaiResponse.json();
    const fullSummary = data.choices[0].message.content;
    
    const sections = {
      structure: extractSection(fullSummary, "Structure"),
      keyConcepts: extractSection(fullSummary, "Key Concepts"),
      mainIdeas: extractSection(fullSummary, "Main Ideas"),
      importantQuotes: extractSection(fullSummary, "Important Quotes"),
      relationships: extractSection(fullSummary, "Relationships and Connections"),
      supportingEvidence: extractSection(fullSummary, "Supporting Evidence & Examples"),
      fullContent: extractSection(fullSummary, "Full Content"),
    };

    console.log('Successfully generated structured summary');

    return new Response(
      JSON.stringify({ summary: sections }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating summary:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Please try again in a few moments or contact support if the issue persists.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function extractSection(markdown: string, sectionTitle: string): string {
  const regex = new RegExp(`# ${sectionTitle}([^#]*)`);
  const match = markdown.match(regex);
  return match ? match[1].trim() : '';
}
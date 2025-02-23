
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

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.error('OpenAI API key not configured');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { lectureId } = await req.json();
    console.log('Processing lecture ID:', lectureId);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch lecture and AI config in parallel
    const [lectureResult, configResult] = await Promise.all([
      supabase.from('lectures').select('content, title').eq('id', lectureId).single(),
      supabase.from('lecture_ai_configs').select('*').eq('lecture_id', lectureId).maybeSingle()
    ]);

    if (lectureResult.error) {
      console.error('Error fetching lecture:', lectureResult.error);
      throw lectureResult.error;
    }
    
    if (!lectureResult.data?.content) {
      console.error('No content found for lecture:', lectureId);
      throw new Error('No lecture content found');
    }

    const lecture = lectureResult.data;
    const aiConfig = configResult.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.8, // Increased default detail level
      content_language: null,
      custom_instructions: null
    };

    console.log('Using AI config:', JSON.stringify(aiConfig));
    console.log('Lecture content length:', lecture.content.length);

    // Calculate depth of analysis based on detail level (increased)
    const analysisDepth = Math.ceil(aiConfig.detail_level * 8); // 1-8 scale
    const maxExamples = Math.ceil(aiConfig.detail_level * 6); // 1-6 examples
    
    const languageStyle = aiConfig.creativity_level > 0.7 ? 'engaging and imaginative' :
                         aiConfig.creativity_level > 0.4 ? 'balanced and clear' : 'precise and academic';

    let systemMessage = `You are an expert educational content analyzer tasked with creating a comprehensive and detailed summary of lecture content. Generate content in ${aiConfig.content_language || 'the original content language'} with a ${languageStyle} style.

For each section, provide extensive detail and analysis:

1. STRUCTURE (Detailed Outline):
   - Create a comprehensive hierarchical outline with ALL headings and subheadings
   - Use proper markdown heading levels (# for main, ## for sub)
   - Include brief descriptions under each major section
   - Maintain exact numbering and structure

2. KEY CONCEPTS (In-Depth Analysis):
   - Identify and thoroughly explain ${maxExamples} essential concepts
   - For each concept provide:
     * Detailed definition with context
     * Multiple real-world examples
     * Practical applications
     * Related theories or frameworks
     * Common misconceptions
   - Format as a dictionary with concept names as keys

3. MAIN IDEAS (Comprehensive Analysis):
   - Extract ${maxExamples} central themes
   - For each main idea include:
     * Detailed explanation with supporting evidence
     * Historical context or background
     * Practical implications
     * Counter-arguments or limitations
     * Future implications or developments
   - Format as a dictionary with theme titles as keys

4. IMPORTANT QUOTES (Critical Analysis):
   - Select ${maxExamples} significant quotes
   - For each quote provide:
     * The exact quote and its context
     * Detailed analysis of its significance
     * Historical or theoretical background
     * Connection to other concepts
     * Modern-day relevance
     * Alternative interpretations
   - Format as a dictionary with section references as keys

5. RELATIONSHIPS (Complex Connections):
   - Analyze interconnections between concepts
   - Include:
     * Direct and indirect relationships
     * Cause-effect chains
     * Hierarchical structures
     * Cross-disciplinary connections
     * Practical implications of relationships
   - Format as a dictionary with relationship types as keys

6. SUPPORTING EVIDENCE (Comprehensive Data):
   - Extract and analyze ALL:
     * Numerical data and statistics
     * Research findings
     * Case studies
     * Historical examples
     * Expert opinions
     * Methodological details
   - Format as a dictionary with evidence types as keys

${aiConfig.custom_instructions ? `\nADDITIONAL REQUIREMENTS:\n${aiConfig.custom_instructions}` : ''}

Your goal is to create an exceptionally detailed and scholarly analysis that goes beyond surface-level summaries. Each section should provide deep insights and comprehensive understanding of the material.

Return a JSON object with this structure:
{
  "structure": "Detailed hierarchical outline with descriptions",
  "keyConcepts": {
    "[concept]": "Comprehensive explanation with examples and applications",
    ...
  },
  "mainIdeas": {
    "[idea]": "In-depth analysis with context and implications",
    ...
  },
  "importantQuotes": {
    "[section]": "Quote analysis with context and multiple interpretations",
    ...
  },
  "relationships": {
    "[type]": "Detailed connection analysis with implications",
    ...
  },
  "supportingEvidence": {
    "[type]": "Comprehensive evidence analysis",
    ...
  },
  "fullContent": "Complete markdown-formatted comprehensive summary"
}`;

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
          { role: 'system', content: systemMessage },
          { 
            role: 'user', 
            content: `Title: ${lecture.title}\n\nAnalyze this lecture content following the specified format and detail level:\n\n${lecture.content}` 
          }
        ],
        temperature: aiConfig.temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('OpenAI Response Status:', response.status);
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Unexpected OpenAI response format:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    let rawContent = data.choices[0].message.content.trim();
    // Clean up the response by removing JSON code block markers
    rawContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    let summary;
    try {
      summary = JSON.parse(rawContent);
      console.log('Successfully parsed summary');
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.log('Raw content that failed to parse:', rawContent);
      throw new Error('Failed to parse AI response');
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-lecture-summary:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

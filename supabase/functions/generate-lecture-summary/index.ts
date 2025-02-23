
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
      detail_level: 0.6,
      content_language: null,
      custom_instructions: null
    };

    console.log('Using AI config:', JSON.stringify(aiConfig));
    console.log('Lecture content length:', lecture.content.length);

    // Calculate depth of analysis based on detail level
    const analysisDepth = Math.ceil(aiConfig.detail_level * 5); // 1-5 scale
    const maxExamples = Math.ceil(aiConfig.detail_level * 4); // 1-4 examples
    
    // Adjust creativity in language based on creativity level
    const languageStyle = aiConfig.creativity_level > 0.7 ? 'engaging and imaginative' :
                         aiConfig.creativity_level > 0.4 ? 'balanced and clear' : 'precise and academic';

    let systemMessage = `You are an expert educational content analyzer tasked with creating a detailed summary of lecture content. Generate content in ${aiConfig.content_language || 'the original content language'} with a ${languageStyle} style.

Guidelines for each section:

1. STRUCTURE (Hierarchical Organization):
   - Extract and list ALL titles and subtitles in their exact hierarchical order
   - Use proper markdown heading levels (# for main titles, ## for subtitles)
   - Maintain the exact numbering and structure from the lecture

2. KEY CONCEPTS (Detailed Definitions):
   - Identify and explain ${maxExamples} primary concepts from the lecture
   - For each concept provide:
     * Clear definition
     * Practical examples
     * Context within the broader topic
   - Format as a dictionary with concept names as keys

3. MAIN IDEAS (Core Themes):
   - Identify ${maxExamples} central themes or arguments
   - For each idea provide:
     * Detailed explanation
     * Supporting points
     * Implications or applications
   - Format as a dictionary with theme titles as keys

4. IMPORTANT QUOTES (Direct Citations):
   - Extract ${maxExamples} significant quotes VERBATIM from the text
   - Include section references for context
   - Only use exact quotes, no paraphrasing
   - Format as a dictionary with section references as keys

5. RELATIONSHIPS (Concept Mapping):
   - Analyze how different concepts interconnect
   - Identify cause-effect relationships
   - Explain hierarchical relationships
   - Highlight dependencies between concepts
   - Format as a dictionary with relationship types as keys

6. SUPPORTING EVIDENCE (Quantifiable Data):
   - Extract ALL numerical data, statistics, and metrics
   - Include dates, percentages, measurements, etc.
   - Provide specific figures and their context
   - Format as a dictionary with evidence types as keys

CUSTOM REQUIREMENTS:
${aiConfig.custom_instructions ? aiConfig.custom_instructions : 'Follow standard academic format'}

Return a JSON object with the exact structure:
{
  "structure": "Hierarchical list with proper markdown headings",
  "keyConcepts": {
    "[concept name]": "Detailed explanation with examples",
    ...
  },
  "mainIdeas": {
    "[idea title]": "Comprehensive explanation with implications",
    ...
  },
  "importantQuotes": {
    "[section reference]": "Exact quote from the text",
    ...
  },
  "relationships": {
    "[relationship type]": "Detailed connection analysis",
    ...
  },
  "supportingEvidence": {
    "[evidence type]": "Specific numerical or factual data",
    ...
  },
  "fullContent": "Complete markdown-formatted summary integrating all sections"
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

    const data = await response.json();
    console.log('OpenAI Response Status:', response.status);
    
    if (!response.ok) {
      console.error('OpenAI API error:', data.error);
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error('Unexpected OpenAI response format:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    let rawContent = data.choices[0].message.content.trim();
    rawContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    let summary;
    try {
      summary = JSON.parse(rawContent);
      console.log('Successfully parsed summary');
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.log('Cleaned response that failed to parse:', rawContent);
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


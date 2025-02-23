
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

    let systemMessage = `You are an expert educational content analyzer tasked with creating a highly detailed summary of lecture content. Your analysis should be ${languageStyle} in tone, with a depth level of ${analysisDepth}/5.

Content Language: ${aiConfig.content_language || 'Use the original content language'}

Guidelines for analysis:
1. DEPTH OF ANALYSIS (${analysisDepth}/5):
   - Provide ${maxExamples} detailed examples for each key concept
   - Include specific context and implications for each main idea
   - Analyze interconnections between concepts thoroughly

2. STYLE AND TONE (Creativity Level: ${aiConfig.creativity_level}):
   - Use ${languageStyle} language
   - Maintain academic rigor while adjusting engagement level
   - Create clear, ${aiConfig.creativity_level > 0.5 ? 'engaging' : 'straightforward'} explanations

3. MARKDOWN FORMATTING:
   - Use bullet points (*) for structured lists
   - Apply **bold** for key terms and important concepts
   - Format quotes using proper blockquotes (>)
   - Create clear section hierarchies with headings (#)

4. CUSTOM REQUIREMENTS:
${aiConfig.custom_instructions ? aiConfig.custom_instructions : 'Follow standard academic format'}

Return a JSON object with the following structure:
{
  "structure": "Detailed bullet-point breakdown of lecture organization",
  "keyConcepts": {
    "[concept name]": "In-depth definition with **key terms** and ${maxExamples} examples",
    // Include at least 5 key concepts
  },
  "mainIdeas": {
    "[idea title]": "Comprehensive explanation with supporting details and implications",
    // Include at least 4 main ideas
  },
  "importantQuotes": {
    "[section reference]": "> Direct quote with detailed context and significance",
    // Include at least 3 relevant quotes
  },
  "relationships": {
    "[relationship type]": "Analysis of concept interconnections with specific examples",
    // Include at least 4 relationship analyses
  },
  "supportingEvidence": {
    "[evidence type]": "* Detailed point\\n* Supporting details\\n* Specific examples",
    // Include at least 3 pieces of evidence
  },
  "fullContent": "Comprehensive markdown-formatted summary integrating all sections"
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
            content: `Title: ${lecture.title}\n\nProvide a comprehensive analysis of this lecture content following the specified format and detail level:\n\n${lecture.content}` 
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

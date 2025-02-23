
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
      detail_level: 0.8,
      content_language: null,
      custom_instructions: null
    };

    console.log('Using AI config:', JSON.stringify(aiConfig));
    console.log('Lecture content length:', lecture.content.length);

    const analysisDepth = Math.ceil(aiConfig.detail_level * 8);
    const maxExamples = Math.ceil(aiConfig.detail_level * 6);
    
    const languageStyle = aiConfig.creativity_level > 0.7 ? 'engaging and imaginative' :
                         aiConfig.creativity_level > 0.4 ? 'balanced and clear' : 'precise and academic';

    const systemMessage = `You are an expert educational content analyzer tasked with creating a comprehensive and detailed summary of lecture content. Generate content in ${aiConfig.content_language || 'the original content language'} with a ${languageStyle} style.

Your response must be a valid JSON object with the following structure:
{
  "structure": "string containing hierarchical outline with markdown formatting",
  "keyConcepts": {
    "concept1": "detailed explanation",
    "concept2": "detailed explanation"
  },
  "mainIdeas": {
    "idea1": "explanation with context",
    "idea2": "explanation with context"
  },
  "importantQuotes": {
    "quote1": "analysis and context",
    "quote2": "analysis and context"
  },
  "relationships": {
    "relationship1": "explanation",
    "relationship2": "explanation"
  },
  "supportingEvidence": {
    "evidence1": "analysis",
    "evidence2": "analysis"
  },
  "fullContent": "complete markdown-formatted summary"
}

Follow these requirements:
1. Ensure all JSON property names use double quotes
2. Ensure all string values use double quotes, not single quotes
3. Escape any double quotes within string values
4. Do not include any Markdown code block syntax (\`\`\`) in your response
5. Do not include any line breaks within string values - use \\n instead
6. Identify ${maxExamples} key items for each section
7. Provide detailed analysis at depth level ${analysisDepth}
${aiConfig.custom_instructions ? `\nAdditional Requirements:\n${aiConfig.custom_instructions}` : ''}`;

    console.log('Sending request to OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
    
    console.log('Raw content before cleanup:', rawContent.substring(0, 100) + '...');

    rawContent = rawContent
      .replace(/^[\s\n]*\{/, '{')
      .replace(/\}[\s\n]*$/, '}')
      .replace(/```(?:json)?\n?/g, '')
      .replace(/(?<!\\)(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
      .replace(/:\s*'([^']*?)'/g, ':"$1"')
      .replace(/([^\\])"/g, '$1\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
      .replace(/\t/g, '\\t')
      .replace(/\\/g, '\\\\')
      .replace(/\\\\/g, '\\')
      .replace(/\\"/g, '"')
      .replace(/"{/g, '{')
      .replace(/}"/g, '}');

    console.log('Cleaned content:', rawContent.substring(0, 100) + '...');

    try {
      const summary = JSON.parse(rawContent);

      const requiredFields = ['structure', 'keyConcepts', 'mainIdeas', 'importantQuotes', 'relationships', 'supportingEvidence', 'fullContent'];
      const missingFields = requiredFields.filter(field => !summary[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields in summary:', missingFields);
        throw new Error(`Invalid summary structure: missing fields ${missingFields.join(', ')}`);
      }

      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.log('Content that failed to parse:', rawContent);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

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


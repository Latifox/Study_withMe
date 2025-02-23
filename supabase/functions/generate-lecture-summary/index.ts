
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

    let systemMessage = `You are an expert educational content analyzer tasked with creating a comprehensive and detailed summary of lecture content. Generate content in ${aiConfig.content_language || 'the original content language'} with a ${languageStyle} style.

Return a valid JSON object with the following properties (use double quotes for all property names and string values):

{
  "structure": "string",
  "keyConcepts": {
    "conceptName1": "string",
    "conceptName2": "string"
  },
  "mainIdeas": {
    "ideaTitle1": "string",
    "ideaTitle2": "string"
  },
  "importantQuotes": {
    "section1": "string",
    "section2": "string"
  },
  "relationships": {
    "type1": "string",
    "type2": "string"
  },
  "supportingEvidence": {
    "type1": "string",
    "type2": "string"
  },
  "fullContent": "string"
}

For each section:

1. Structure: Create a hierarchical outline with all headings and subheadings, using markdown formatting.

2. Key Concepts: Identify and explain ${maxExamples} essential concepts with definitions, examples, and applications.

3. Main Ideas: Extract ${maxExamples} central themes with explanations, context, and implications.

4. Important Quotes: Select ${maxExamples} significant quotes with analysis and context.

5. Relationships: Analyze interconnections between concepts, including cause-effect and hierarchical structures.

6. Supporting Evidence: Extract and analyze numerical data, research findings, and examples.

7. Full Content: Provide a complete markdown-formatted comprehensive summary.

${aiConfig.custom_instructions ? `\nAdditional Requirements:\n${aiConfig.custom_instructions}` : ''}

Important: Ensure all JSON property names and string values use double quotes, not single quotes.`;

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
    
    // Clean up the response to ensure valid JSON
    rawContent = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/(?<!\\)"/g, '\\"')  // Escape unescaped double quotes
      .replace(/^\s*{\s*/, '{')     // Clean up start of JSON
      .replace(/\s*}\s*$/, '}');    // Clean up end of JSON

    console.log('Cleaned content length:', rawContent.length);
    console.log('First 100 characters:', rawContent.substring(0, 100));

    let summary;
    try {
      summary = JSON.parse(rawContent);
      console.log('Successfully parsed summary');
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.log('Raw content that failed to parse:', rawContent);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // Validate the summary structure
    const requiredFields = ['structure', 'keyConcepts', 'mainIdeas', 'importantQuotes', 'relationships', 'supportingEvidence', 'fullContent'];
    const missingFields = requiredFields.filter(field => !summary[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields in summary:', missingFields);
      throw new Error(`Invalid summary structure: missing fields ${missingFields.join(', ')}`);
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

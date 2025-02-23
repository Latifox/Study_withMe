
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

    const analysisDepth = Math.ceil(aiConfig.detail_level * 8);
    const maxExamples = Math.ceil(aiConfig.detail_level * 6);
    
    const languageStyle = aiConfig.creativity_level > 0.7 ? 'engaging and imaginative' :
                         aiConfig.creativity_level > 0.4 ? 'balanced and clear' : 'precise and academic';

    const systemMessage = `You are an expert educational content analyzer tasked with creating a comprehensive summary of lecture content. Your response must be a valid JSON object without any markdown formatting or code blocks. Format all content with proper JSON escaping.

Format your response exactly like this (replace example values with actual content):
{
  "structure": "Lecture outline with main points",
  "keyConcepts": {
    "concept1": "explanation1",
    "concept2": "explanation2"
  },
  "mainIdeas": {
    "idea1": "explanation1",
    "idea2": "explanation2"
  },
  "importantQuotes": {
    "context1": "quote and analysis1",
    "context2": "quote and analysis2"
  },
  "relationships": {
    "connection1": "explanation1",
    "connection2": "explanation2"
  },
  "supportingEvidence": {
    "point1": "evidence1",
    "point2": "evidence2"
  },
  "fullContent": "complete detailed summary"
}

Guidelines:
1. Use exactly this JSON structure
2. Do not include any markdown code blocks or \`\`\`json
3. Always use double quotes for property names and string values
4. Never use single quotes
5. Escape special characters in strings properly (use \\" for quotes, \\n for newlines)
6. Provide ${maxExamples} items per section
7. Use analysis depth level ${analysisDepth}
8. Use ${aiConfig.content_language || 'the original content language'} with a ${languageStyle} style
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
            content: `Title: ${lecture.title}\n\nGenerate a structured summary following the exact JSON format specified:\n\n${lecture.content}` 
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
    console.log('Raw content:', rawContent);

    // Basic validation check
    if (!rawContent.startsWith('{') || !rawContent.endsWith('}')) {
      console.error('Content is not a valid JSON object:', rawContent);
      throw new Error('Invalid JSON structure received from OpenAI');
    }

    try {
      // First parse attempt with raw content
      const summary = JSON.parse(rawContent);
      
      // Validate required fields
      const requiredFields = ['structure', 'keyConcepts', 'mainIdeas', 'importantQuotes', 'relationships', 'supportingEvidence', 'fullContent'];
      const missingFields = requiredFields.filter(field => !summary[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        throw new Error(`Invalid summary structure: missing fields ${missingFields.join(', ')}`);
      }

      console.log('Successfully parsed JSON');
      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('First parse attempt failed:', parseError);
      
      // Try minimal cleanup before second attempt
      try {
        const cleanContent = rawContent
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '')
          .replace(/\t/g, '\\t');
        
        console.log('Attempting parse with cleaned content:', cleanContent);
        const summary = JSON.parse(cleanContent);
        
        return new Response(JSON.stringify({ summary }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (secondError) {
        console.error('Second parse attempt failed:', secondError);
        console.error('Content that failed to parse:', rawContent);
        throw new Error(`Failed to parse AI response after cleanup: ${secondError.message}`);
      }
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

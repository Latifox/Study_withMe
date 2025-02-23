
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
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get lecture content and AI config
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

    let systemMessage = `You are an educational content analyzer tasked with creating a detailed summary of the lecture content provided. Your output should use proper markdown formatting for better readability and structure.

Content Language: ${aiConfig.content_language || 'Use the original content language'}

Guidelines for analysis:
- Creativity Level: ${aiConfig.creativity_level} (higher means more creative and engaging language)
- Detail Level: ${aiConfig.detail_level} (higher means more comprehensive analysis)
- Format lists using proper markdown bullet points (*)
- Use markdown formatting for emphasis (**bold**)
- Format quotes using proper markdown blockquotes (>)
- Include section headings with markdown (#)
- Create well-structured, hierarchical content
${aiConfig.custom_instructions ? `\nAdditional Instructions: ${aiConfig.custom_instructions}` : ''}

Return a JSON object with the following structure:
{
  "structure": "Use bullet points (*) for sections and subsections",
  "keyConcepts": {
    "concept1": "definition with **important terms** in bold",
    "concept2": "another definition"
  },
  "mainIdeas": {
    "idea1": "explanation with **key points** emphasized",
    "idea2": "another main idea explanation"
  },
  "importantQuotes": {
    "quote1": "> This is how a quote should be formatted",
    "quote2": "> Another important quote with context"
  },
  "relationships": {
    "relationship1": "Description with **key connections** highlighted",
    "relationship2": "Another relationship explanation"
  },
  "supportingEvidence": {
    "evidence1": "* Point 1\\n* Point 2\\n* Point 3",
    "evidence2": "More supporting evidence with **emphasis**"
  },
  "fullContent": "Complete markdown-formatted summary with all sections"
}`;

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
            content: `Title: ${lecture.title}\n\nProvide a comprehensive analysis of this lecture content using proper markdown formatting:\n\n${lecture.content}` 
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

    // Clean up the response
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

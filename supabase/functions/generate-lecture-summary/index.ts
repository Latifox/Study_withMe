
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

    let systemMessage = `You are an educational content analyzer tasked with creating a detailed summary of the lecture content provided.
    
Guidelines for analysis:
- Creativity Level: ${aiConfig.creativity_level} (higher means more creative and engaging language)
- Detail Level: ${aiConfig.detail_level} (higher means more comprehensive analysis)
- Analyze the ENTIRE lecture content thoroughly
- Extract SPECIFIC quotes directly from the text
- Provide detailed examples and context for each section
- Focus on creating a comprehensive and academic analysis
${aiConfig.custom_instructions ? `Additional Instructions: ${aiConfig.custom_instructions}` : ''}

Return your response as a JSON object with the following structure:
{
  "structure": "Detailed overview of how the lecture content is organized, including main sections and their progression",
  "keyConcepts": "Comprehensive list of theoretical concepts and their definitions, with examples from the text",
  "mainIdeas": "In-depth analysis of the core arguments and ideas presented",
  "importantQuotes": "Direct quotes from the lecture text with page/section references and explanation of their significance",
  "relationships": "Analysis of how different concepts and ideas interconnect and influence each other",
  "supportingEvidence": "Specific examples, data, or evidence used to support the main arguments",
  "fullContent": "Detailed, comprehensive summary of the entire lecture content"
}

Important: Do not use markdown formatting or code blocks in your response. Return only the raw JSON object.
${aiConfig.content_language ? `Provide the response in ${aiConfig.content_language}.` : ''}`;

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
            content: `Title: ${lecture.title}\n\nAnalyze this lecture content in detail:\n\n${lecture.content}` 
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

    // Clean up the response by removing any markdown formatting
    let rawContent = data.choices[0].message.content;
    console.log('Raw OpenAI response:', rawContent);

    // Remove markdown code block syntax if present
    rawContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

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


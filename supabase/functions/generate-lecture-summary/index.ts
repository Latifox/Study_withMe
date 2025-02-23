
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { lectureId, part } = await req.json();
    console.log('Processing lecture ID:', lectureId, 'part:', part);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [lectureResult, configResult] = await Promise.all([
      supabase.from('lectures').select('content, title').eq('id', lectureId).single(),
      supabase.from('lecture_ai_configs').select('*').eq('lecture_id', lectureId).maybeSingle()
    ]);

    if (lectureResult.error) throw lectureResult.error;
    if (!lectureResult.data?.content) throw new Error('No lecture content found');

    const lecture = lectureResult.data;
    const aiConfig = configResult.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.8,
      content_language: 'Romanian',
      custom_instructions: null
    };

    const analysisDepth = Math.ceil(aiConfig.detail_level * 8);
    const maxExamples = Math.ceil(aiConfig.detail_level * 6);
    
    let systemMessage = "";
    let responseFormat = "";

    switch(part) {
      case 'part1':
        systemMessage = `You are an expert educational content analyzer focused on structural analysis and key concepts. Analyze the lecture content and provide:
1. A detailed outline of the lecture structure
2. Key concepts with detailed explanations
3. Main ideas with thorough analysis
Format your response as a clean, properly escaped JSON object with these exact keys: structure, keyConcepts, mainIdeas`;
        responseFormat = `{
  "structure": "List of main points and sub-points",
  "keyConcepts": {
    "concept1": "detailed explanation",
    "concept2": "detailed explanation"
  },
  "mainIdeas": {
    "idea1": "thorough analysis",
    "idea2": "thorough analysis"
  }
}`;
        break;

      case 'part2':
        systemMessage = `You are an expert educational content analyzer focused on relationships and evidence. Analyze the lecture content and provide:
1. Important quotes with context and analysis
2. Key relationships and connections between concepts
3. Supporting evidence and examples
Format your response as a clean, properly escaped JSON object with these exact keys: importantQuotes, relationships, supportingEvidence`;
        responseFormat = `{
  "importantQuotes": {
    "quote1": "context and analysis",
    "quote2": "context and analysis"
  },
  "relationships": {
    "connection1": "detailed explanation",
    "connection2": "detailed explanation"
  },
  "supportingEvidence": {
    "evidence1": "detailed analysis",
    "evidence2": "detailed analysis"
  }
}`;
        break;

      case 'full':
        systemMessage = `You are an expert educational content summarizer. Create a comprehensive, flowing summary of the entire lecture content that ties together all key points, concepts, and relationships.
Format your response as a clean JSON object with a single key: fullContent`;
        responseFormat = `{
  "fullContent": "comprehensive flowing summary"
}`;
        break;

      default:
        throw new Error('Invalid part specified');
    }

    // Add common instructions
    systemMessage += `\n\nGuidelines:
1. Use exactly this JSON structure
2. Provide ${maxExamples} detailed items per section
3. Use analysis depth level ${analysisDepth}
4. Use ${aiConfig.content_language} with clear academic style
5. Escape all special characters in JSON strings
6. Format example: ${responseFormat}
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
            content: `Title: ${lecture.title}\n\nGenerate a structured analysis following the exact JSON format specified:\n\n${lecture.content}` 
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
      throw new Error('Invalid response format from OpenAI');
    }

    let rawContent = data.choices[0].message.content.trim();
    
    // Basic validation
    if (!rawContent.startsWith('{') || !rawContent.endsWith('}')) {
      console.error('Invalid JSON structure received:', rawContent);
      throw new Error('Invalid JSON structure received from OpenAI');
    }

    try {
      const parsedContent = JSON.parse(rawContent);
      return new Response(JSON.stringify({ content: parsedContent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Parse error:', parseError);
      throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Error in generate-lecture-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

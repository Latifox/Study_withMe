
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content, title')
      .eq('id', parseInt(lectureId))
      .single();

    if (lectureError) throw lectureError;
    if (!lecture?.content) throw new Error('No lecture content found');

    let systemMessage = "";
    let responseFormat = "";

    switch(part) {
      case 'part1':
        systemMessage = `You are an expert educational content analyzer. Create a structured response with sections for lecture structure, key concepts, and main ideas. The response should be in valid JSON format but maintain markdown formatting within the text content.`;
        responseFormat = `{
          "structure": "markdown formatted overview",
          "keyConcepts": {
            "concept1": "explanation1",
            "concept2": "explanation2"
          },
          "mainIdeas": {
            "idea1": "explanation1",
            "idea2": "explanation2"
          }
        }`;
        break;

      case 'part2':
        systemMessage = `You are an expert educational content analyzer. Create a structured response with important quotes, relationships between concepts, and supporting evidence. The response should be in valid JSON format but maintain markdown formatting within the text content.`;
        responseFormat = `{
          "importantQuotes": {
            "context1": "quote1",
            "context2": "quote2"
          },
          "relationships": {
            "connection1": "explanation1",
            "connection2": "explanation2"
          },
          "supportingEvidence": {
            "evidence1": "explanation1",
            "evidence2": "explanation2"
          }
        }`;
        break;

      case 'full':
        systemMessage = `You are an expert educational content summarizer. Create a comprehensive summary with markdown formatting.`;
        responseFormat = `{
          "fullContent": "full markdown-formatted summary"
        }`;
        break;

      default:
        throw new Error('Invalid part specified');
    }

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
          { 
            role: 'system', 
            content: `${systemMessage}\nFormat the response exactly like this: ${responseFormat}`
          },
          { 
            role: 'user', 
            content: `Title: ${lecture.title}\n\nContent:\n${lecture.content}`
          }
        ],
        temperature: 0.7,
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
    console.log('Raw content:', rawContent);
    
    try {
      const parsedContent = JSON.parse(rawContent);
      return new Response(JSON.stringify({ content: parsedContent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Parse error:', parseError, '\nRaw content:', rawContent);
      // Try to clean the content before parsing again
      const cleanedContent = rawContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '')
        .trim();
      
      try {
        const parsedContent = JSON.parse(cleanedContent);
        return new Response(JSON.stringify({ content: parsedContent }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (secondParseError) {
        throw new Error(`Failed to parse OpenAI response: ${secondParseError.message}`);
      }
    }
  } catch (error) {
    console.error('Error in generate-lecture-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

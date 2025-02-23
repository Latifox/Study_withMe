
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatTitle(title: string): string {
  return title
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Capitalize first letter of each word
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatResponse(content: Record<string, any>): Record<string, any> {
  console.log('Formatting response content:', JSON.stringify(content));
  const formattedContent: Record<string, any> = {};
  
  for (const [category, items] of Object.entries(content)) {
    if (typeof items === 'object' && items !== null) {
      const formattedItems: Record<string, string> = {};
      for (const [key, value] of Object.entries(items)) {
        formattedItems[formatTitle(key)] = value;
      }
      formattedContent[category] = formattedItems;
    } else {
      formattedContent[category] = items;
    }
  }
  
  console.log('Formatted content:', JSON.stringify(formattedContent));
  return formattedContent;
}

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

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw lectureError;
    }
    if (!lecture?.content) {
      console.error('No lecture content found for ID:', lectureId);
      throw new Error('No lecture content found');
    }

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
        systemMessage = `You are an expert educational content analyzer. Create a structured response with important quotes, relationships between concepts, and supporting evidence. Use descriptive titles for each item. The response should be in valid JSON format but maintain markdown formatting within the text content.`;
        responseFormat = `{
          "importantQuotes": {
            "Key Definition of Energy Production": "quote1",
            "Contrasting Production Methods": "quote2"
          },
          "relationships": {
            "Centralized vs Distributed Production": "explanation1",
            "Renewable vs Non-renewable Sources": "explanation2"
          },
          "supportingEvidence": {
            "Historical Energy Consumption": "explanation1",
            "Fossil Fuel Statistics": "explanation2"
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
        console.error('Invalid part specified:', part);
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
            content: `${systemMessage}\nFormat the response exactly like this: ${responseFormat}. Use clear, descriptive titles that don't contain underscores or technical identifiers.`
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
      console.error('Invalid response format from OpenAI:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    let rawContent = data.choices[0].message.content.trim();
    console.log('Raw content:', rawContent);
    
    try {
      const parsedContent = JSON.parse(rawContent);
      console.log('Successfully parsed content');
      const formattedContent = formatResponse(parsedContent);
      return new Response(JSON.stringify({ content: formattedContent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Parse error:', parseError, '\nRaw content:', rawContent);
      // Try to clean the content before parsing again
      const cleanedContent = rawContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '')
        .trim();
      
      console.log('Attempting to parse cleaned content:', cleanedContent);
      
      try {
        const parsedContent = JSON.parse(cleanedContent);
        console.log('Successfully parsed cleaned content');
        const formattedContent = formatResponse(parsedContent);
        return new Response(JSON.stringify({ content: formattedContent }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (secondParseError) {
        console.error('Second parse error:', secondParseError, '\nCleaned content:', cleanedContent);
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

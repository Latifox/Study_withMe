
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatTitle(title: string): string {
  return title
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatResponse(content: Record<string, any>): Record<string, any> {
  try {
    console.log('Input content to formatResponse:', JSON.stringify(content));
    const formattedContent: Record<string, any> = {};
    
    for (const [category, items] of Object.entries(content)) {
      if (typeof items === 'object' && items !== null) {
        const formattedItems: Record<string, string> = {};
        for (const [key, value] of Object.entries(items)) {
          const formattedKey = formatTitle(key);
          formattedItems[formattedKey] = String(value);
        }
        formattedContent[category] = formattedItems;
      } else {
        formattedContent[category] = String(items);
      }
    }
    
    console.log('Formatted content:', JSON.stringify(formattedContent));
    return formattedContent;
  } catch (error) {
    console.error('Error in formatResponse:', error);
    throw error;
  }
}

async function getAIConfig(supabase: any, lectureId: number) {
  console.log('Fetching AI config for lecture:', lectureId);
  const { data, error } = await supabase
    .from('lecture_ai_configs')
    .select('*')
    .eq('lecture_id', lectureId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching AI config:', error);
    return null;
  }

  // If no config is found, return default values
  return data || {
    temperature: 0.7,
    creativity_level: 0.5,
    detail_level: 0.6,
    content_language: 'English',
    custom_instructions: ''
  };
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
    
    if (!lectureId || !part) {
      throw new Error('Missing required parameters: lectureId or part');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch AI configuration
    const aiConfig = await getAIConfig(supabase, lectureId);
    console.log('Using AI config:', aiConfig);

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

    // Enhance system messages with AI configuration
    const baseSystemMessage = {
      part1: `You are an expert educational content analyzer. Create a structured response with sections for lecture structure, key concepts, and main ideas. The response should be in valid JSON format but maintain markdown formatting within the text content. Use descriptive titles without underscores or technical identifiers.`,
      part2: `You are an expert educational content analyzer. Create a structured response with important quotes, relationships between concepts, and supporting evidence. Use descriptive titles for each item. The response should be in valid JSON format but maintain markdown formatting within the text content.`,
      full: `You are an expert educational content summarizer. Create a comprehensive summary with markdown formatting.`
    };

    // Add AI configuration context to system message
    let systemMessage = baseSystemMessage[part as keyof typeof baseSystemMessage];
    if (aiConfig.custom_instructions) {
      systemMessage += `\n\nCustom Instructions: ${aiConfig.custom_instructions}`;
    }
    
    // Add language preference if specified
    if (aiConfig.content_language && aiConfig.content_language !== 'English') {
      systemMessage += `\n\nPlease provide the response in ${aiConfig.content_language}.`;
    }

    const responseFormats = {
      part1: {
        structure: "markdown formatted overview",
        keyConcepts: {
          "Concept Title 1": "explanation1",
          "Concept Title 2": "explanation2"
        },
        mainIdeas: {
          "Main Idea Title 1": "explanation1",
          "Main Idea Title 2": "explanation2"
        }
      },
      part2: {
        importantQuotes: {
          "Quote Context 1": "quote1",
          "Quote Context 2": "quote2"
        },
        relationships: {
          "Relationship Title 1": "explanation1",
          "Relationship Title 2": "explanation2"
        },
        supportingEvidence: {
          "Evidence Title 1": "evidence1",
          "Evidence Title 2": "evidence2"
        }
      },
      full: {
        fullContent: "full markdown-formatted summary"
      }
    };

    if (!systemMessage) {
      console.error('Invalid part specified:', part);
      throw new Error('Invalid part specified');
    }

    console.log('Sending request to OpenAI with configuration:', {
      temperature: aiConfig.temperature,
      creativity: aiConfig.creativity_level,
      detail: aiConfig.detail_level
    });
    
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
            content: `${systemMessage}\nFormat the response exactly like this:\n${JSON.stringify(responseFormats[part as keyof typeof responseFormats], null, 2)}`
          },
          { 
            role: 'user', 
            content: `Title: ${lecture.title}\n\nContent:\n${lecture.content}`
          }
        ],
        temperature: aiConfig.temperature,
        presence_penalty: aiConfig.creativity_level * 0.5, // Scale creativity to presence penalty
        frequency_penalty: aiConfig.detail_level * 0.5,    // Scale detail level to frequency penalty
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
    console.log('Raw content from OpenAI:', rawContent);
    
    try {
      const parsedContent = JSON.parse(rawContent);
      console.log('Successfully parsed content');
      const formattedContent = formatResponse(parsedContent);
      return new Response(JSON.stringify({ content: formattedContent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Initial parse error:', parseError);
      console.log('Attempting to clean content before parsing again...');
      
      const cleanedContent = rawContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '')
        .trim();
      
      try {
        const parsedContent = JSON.parse(cleanedContent);
        console.log('Successfully parsed cleaned content');
        const formattedContent = formatResponse(parsedContent);
        return new Response(JSON.stringify({ content: formattedContent }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (secondParseError) {
        console.error('Second parse error:', secondParseError);
        console.log('Cleaned content that failed to parse:', cleanedContent);
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

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

  try {
    const { lectureId } = await req.json();
    console.log('Generating summary for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture?.content) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    console.log('Fetched lecture content, sending to OpenAI...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that creates comprehensive lecture summaries. Please provide a well-structured summary following this format:

# Main Topics
- List the main topics covered in the lecture
- Use bullet points for clarity

# Key Concepts
- Break down important concepts
- Include relevant definitions
- Use **bold** for emphasis on crucial terms

# Important Quotes
> Use proper quote formatting for significant quotes from the lecture
> Include context where necessary

# Summary Points
1. Numbered list of key takeaways
2. Each point should be concise but informative

# Additional Notes
- Any supplementary information
- Related concepts or connections
- Practical applications

VERY IMPORTANT: Maintain the EXACT SAME LANGUAGE as the input text - if the lecture is in Spanish, write the summary in Spanish, if it's in French, write it in French, etc.`
          },
          {
            role: 'user',
            content: lecture.content
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', openaiResponse.status);
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error details:', errorText);
      
      if (openaiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a few moments.' }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    console.log('Successfully generated summary');

    return new Response(
      JSON.stringify({ summary: data.choices[0].message.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating summary:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Please try again in a few moments or contact support if the issue persists.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
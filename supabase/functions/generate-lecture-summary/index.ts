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
    console.log('Generating detailed summary for lecture:', lectureId);

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

    console.log('Fetched lecture content, generating comprehensive summary...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert educational content summarizer. Create a comprehensive, well-structured summary of the lecture content. Follow these guidelines:

1. Maintain the EXACT SAME LANGUAGE as the input text (if Spanish, write in Spanish, if French, write in French, etc.)
2. Structure the summary into these specific sections, using Markdown formatting:

# Main Topics
- List 3-5 main topics covered
- Use clear, concise bullet points
- Highlight key terminology in **bold**

# Key Concepts
- Break down 4-6 important concepts
- Include clear definitions
- Use examples where relevant
- Highlight important terms in **bold**

# Important Quotes
- Select 2-3 significant quotes
- Use proper ">" quote formatting
- Add brief context for each quote
- Attribute quotes when possible

# Additional Notes
- Include practical applications
- Mention related concepts
- Add study tips or memory aids
- Note any prerequisites or follow-up topics

Make each section informative yet concise. Use proper Markdown formatting throughout.`
          },
          {
            role: 'user',
            content: lecture.content
          }
        ],
        temperature: 0.3,
        max_tokens: 2500,
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
    const fullSummary = data.choices[0].message.content;
    
    // Parse the markdown sections
    const sections = {
      mainTopics: extractSection(fullSummary, "Main Topics"),
      keyConcepts: extractSection(fullSummary, "Key Concepts"),
      importantQuotes: extractSection(fullSummary, "Important Quotes"),
      additionalNotes: extractSection(fullSummary, "Additional Notes"),
    };

    console.log('Successfully generated structured summary');

    return new Response(
      JSON.stringify({ summary: sections }),
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

function extractSection(markdown: string, sectionTitle: string): string {
  const regex = new RegExp(`# ${sectionTitle}([^#]*)`);
  const match = markdown.match(regex);
  return match ? match[1].trim() : '';
}
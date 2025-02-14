
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

  try {
    const { lectureId } = await req.json();
    console.log('Generating detailed summary for lecture:', lectureId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lecture content and AI config
    const [{ data: lecture, error: lectureError }, { data: config }] = await Promise.all([
      supabaseClient
        .from('lectures')
        .select('content')
        .eq('id', lectureId)
        .single(),
      supabaseClient
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .single()
    ]);

    if (lectureError || !lecture?.content) {
      console.error('Error fetching lecture:', lectureError);
      throw new Error('Failed to fetch lecture content');
    }

    const aiConfig = config || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6,
      custom_instructions: ''
    };

    console.log('Fetched lecture content and AI config, generating comprehensive summary...');

    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': Deno.env.get('GOOGLE_API_KEY') || '',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{
              text: `Create a comprehensive, well-structured summary of this lecture content:\n\n${lecture.content}\n\n` +
                    `Follow these guidelines:\n` +
                    `1. Structure the summary into these specific sections:\n\n` +
                    `# Structure\n` +
                    `- Outline the organizational structure\n` +
                    `- Identify major sections and subsections\n` +
                    `- Note patterns in information presentation\n` +
                    `- Highlight idea flow\n\n` +
                    `# Key Concepts\n` +
                    `- Break down 4-6 important concepts\n` +
                    `- Include clear definitions\n` +
                    `- Use examples where relevant\n` +
                    `- Highlight important terms in **bold**\n\n` +
                    `# Main Ideas\n` +
                    `- List central arguments/themes\n` +
                    `- Explain core principles\n` +
                    `- Identify key takeaways\n` +
                    `- Connect to broader context\n\n` +
                    `# Important Quotes\n` +
                    `- Select 2-3 significant quotes\n` +
                    `- Use proper ">" quote formatting\n` +
                    `- Add brief context\n` +
                    `- Attribute quotes when possible\n\n` +
                    `# Relationships and Connections\n` +
                    `- Identify links between concepts\n` +
                    `- Show how ideas build\n` +
                    `- Note external connections\n` +
                    `- Highlight cause-effect relationships\n\n` +
                    `# Supporting Evidence & Examples\n` +
                    `- List key examples\n` +
                    `- Describe supporting evidence\n` +
                    `- Include relevant data\n` +
                    `- Note case studies\n\n` +
                    `# Full Content\n` +
                    `Provide comprehensive summary including:\n` +
                    `- In-depth concept explanations\n` +
                    `- Extended examples\n` +
                    `- Detailed analysis\n` +
                    `- Topic connections\n` +
                    `- Study recommendations\n\n` +
                    `Adjust based on:\n` +
                    `- Creativity Level: ${aiConfig.creativity_level}\n` +
                    `- Detail Level: ${aiConfig.detail_level}\n` +
                    `${aiConfig.custom_instructions ? `\nCustom Instructions:\n${aiConfig.custom_instructions}` : ''}`
            }]
          }
        ],
        generationConfig: {
          temperature: aiConfig.temperature,
          maxOutputTokens: 2500,
        }
      }),
    });

    if (!response.ok) {
      console.error('Google API error:', response.status);
      const errorText = await response.text();
      console.error('Google API error details:', errorText);
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    const fullSummary = data.candidates[0].content.parts[0].text;
    
    const sections = {
      structure: extractSection(fullSummary, "Structure"),
      keyConcepts: extractSection(fullSummary, "Key Concepts"),
      mainIdeas: extractSection(fullSummary, "Main Ideas"),
      importantQuotes: extractSection(fullSummary, "Important Quotes"),
      relationships: extractSection(fullSummary, "Relationships and Connections"),
      supportingEvidence: extractSection(fullSummary, "Supporting Evidence & Examples"),
      fullContent: extractSection(fullSummary, "Full Content"),
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

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, part } = await req.json();
    console.log(`Generating ${part} summary for lecture ${lectureId}`);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get lecture content and AI config
    const { data: lecture } = await supabase
      .from('lectures')
      .select('content, title, lecture_ai_configs!inner(*)')
      .eq('id', lectureId)
      .maybeSingle();

    if (!lecture) {
      throw new Error('Lecture not found');
    }

    const { content, title, lecture_ai_configs: config } = lecture;

    if (part === 'full') {
      // For full summary, we only use the lecture content and AI settings
      const prompt = `You are a knowledgeable AI tasked with creating a comprehensive summary of a lecture. 
      
      The lecture title is: "${title}"
      
      Here is the lecture content to summarize:
      ${content}
      
      Please provide a thorough, well-organized summary of this lecture content. Focus on clarity and accuracy.
      Organize the information in a way that makes the most sense for this specific content, without following any pre-defined structure.
      Make sure to capture all important concepts, arguments, and examples from the lecture.
      
      Remember:
      - Don't use any predefined headers or sections
      - Let the content's natural structure guide your organization
      - Be comprehensive but clear
      - Focus on what's actually in the lecture content`;

      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      
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
              content: `You are an AI that creates comprehensive lecture summaries. You adapt your summarization style to the content, without using any pre-defined structure. Temperature: ${config.temperature}, Creativity Level: ${config.creativity_level}, Detail Level: ${config.detail_level}`
            },
            { role: 'user', content: prompt }
          ],
          temperature: config.temperature,
        }),
      });

      const aiResponse = await response.json();
      const fullContent = aiResponse.choices[0].message.content;

      // Update the lecture_highlights table with the full content
      await supabase
        .from('lecture_highlights')
        .upsert({
          lecture_id: lectureId,
          full_content: fullContent
        }, {
          onConflict: 'lecture_id'
        });

      console.log('Full summary generated and stored successfully');
      return new Response(JSON.stringify({ content: { full_content: fullContent } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For regular highlights, fetch existing data
    const { data: existingHighlights, error: highlightsError } = await supabase
      .from('lecture_highlights')
      .select('*')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (highlightsError && highlightsError.code !== 'PGRST116') {
      console.error('Error fetching highlights:', highlightsError);
      throw new Error('Failed to fetch existing highlights');
    }

    // Return existing highlights if available
    if (existingHighlights) {
      return new Response(JSON.stringify({
        content: existingHighlights
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no highlights exist, generate new ones
    console.log('No existing highlights found, generating new ones');

    const systemPrompt = `You are an expert educational content analyzer. Your task is to analyze lecture content and provide a comprehensive analysis organized into six distinct sections, each properly formatted in markdown:

    1. Structure: Provide a clear outline of the content organization
    2. Key Concepts: List and explain the main theoretical concepts
    3. Main Ideas: Summarize the central arguments or themes
    4. Important Quotes: Extract and explain significant quotations
    5. Relationships: Analyze connections between concepts
    6. Supporting Evidence: Detail the evidence used to support main arguments

    ${aiConfig?.custom_instructions ? `\n\nAdditional instructions: ${aiConfig.custom_instructions}` : ''}
    ${aiConfig?.content_language ? `\n\nPlease provide the content in: ${aiConfig.content_language}` : ''}`;

    const userPrompt = `Analyze this lecture content and provide a detailed analysis following the specified sections:\n\n${lectureData.content}`;

    console.log('Sending request to OpenAI for highlights');

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: aiConfig?.temperature ?? 0.7,
        presence_penalty: aiConfig?.creativity_level ?? 0.5,
        frequency_penalty: aiConfig?.detail_level ?? 0.6,
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate content from OpenAI');
    }

    const data = await openAIResponse.json();
    console.log('Received response from OpenAI');

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response format:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    const content = data.choices[0].message.content.trim();

    // Extract sections using regex
    const sections = {
      structure: content.match(/Structure:([^#]*)/s)?.[1]?.trim() || '',
      key_concepts: content.match(/Key Concepts:([^#]*)/s)?.[1]?.trim() || '',
      main_ideas: content.match(/Main Ideas:([^#]*)/s)?.[1]?.trim() || '',
      important_quotes: content.match(/Important Quotes:([^#]*)/s)?.[1]?.trim() || '',
      relationships: content.match(/Relationships:([^#]*)/s)?.[1]?.trim() || '',
      supporting_evidence: content.match(/Supporting Evidence:([^#]*)/s)?.[1]?.trim() || ''
    };

    // Store the highlights
    const { error: insertError } = await supabase
      .from('lecture_highlights')
      .insert([{
        lecture_id: lectureId,
        ...sections
      }]);

    if (insertError) {
      console.error('Error inserting highlights:', insertError);
      throw new Error('Failed to store highlights in database');
    }

    console.log('Successfully processed and stored highlights');

    return new Response(JSON.stringify({
      content: sections
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-lecture-summary:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

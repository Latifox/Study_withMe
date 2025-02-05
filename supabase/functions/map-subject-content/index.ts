
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    console.log('Received request for lecture:', lectureId);

    if (!lectureId) {
      throw new Error('Lecture ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching lecture content, subjects, and AI config...');

    // Fetch lecture content, subjects, and AI config
    const [lectureResult, subjectsResult, aiConfigResult] = await Promise.all([
      supabaseClient
        .from('lectures')
        .select('content')
        .eq('id', lectureId)
        .single(),
      supabaseClient
        .from('subject_definitions')
        .select('*')
        .eq('lecture_id', lectureId)
        .order('chronological_order', { ascending: true }),
      supabaseClient
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .maybeSingle()
    ]);

    if (lectureResult.error) throw lectureResult.error;
    if (subjectsResult.error) throw subjectsResult.error;
    if (aiConfigResult.error) throw aiConfigResult.error;
    if (!lectureResult.data?.content) {
      throw new Error('Lecture content not found');
    }

    const content = lectureResult.data.content;
    const subjects = subjectsResult.data;
    const aiConfig = aiConfigResult.data || {
      temperature: 0.7,
      creativity_level: 0.5,
      detail_level: 0.6
    };

    console.log(`Found ${subjects.length} subjects to process with AI config:`, aiConfig);

    // Delete existing mappings
    if (subjects.length > 0) {
      console.log('Deleting existing mappings...');
      const { error: deleteError } = await supabaseClient
        .from('subject_content_mapping')
        .delete()
        .in('subject_id', subjects.map(s => s.id));

      if (deleteError) throw deleteError;
    }

    // Use OpenAI to analyze content for each subject
    const mappings = [];
    for (const subject of subjects) {
      console.log(`Processing subject: ${subject.title}`);
      
      const prompt = `You are an expert educational content analyzer. Your task is to extract PRECISELY relevant content for "${subject.title}" from the lecture material. Follow these instructions meticulously.

CONTENT EXTRACTION RULES:
1. Identify content that DIRECTLY relates to "${subject.title}"
2. Extract VERBATIM text segments - do not paraphrase or modify
3. Include full, complete sentences or paragraphs only
4. Maintain proper context for each extraction
5. Ensure precise start and end indices for each segment
${subject.details ? `6. Pay special attention to this subject detail: ${subject.details}` : ''}

AI Configuration context (influences extraction precision):
- Temperature: ${aiConfig.temperature}
- Creativity Level: ${aiConfig.creativity_level}
- Detail Level: ${aiConfig.detail_level}

FORMAT REQUIREMENTS:
Return a JSON array where each object MUST follow this EXACT structure:
{
  "content_snippet": "exact extracted text from the source",
  "relevance_score": number between 0.0 and 1.0,
  "start_index": number indicating exact starting position in source text,
  "end_index": number indicating exact ending position in source text
}

Example of correct response format:
[
  {
    "content_snippet": "Newton's First Law states that an object will remain at rest or in uniform motion in a straight line unless acted upon by an external force",
    "relevance_score": 0.95,
    "start_index": 145,
    "end_index": 267
  }
]

IMPORTANT:
- Each object MUST contain ALL four fields
- relevance_score MUST be a number between 0 and 1
- start_index and end_index MUST be valid numbers
- content_snippet MUST be an exact string from the source
- The response MUST be a valid JSON array

Source content to analyze:
${content}`;

      try {
        console.log('Making OpenAI API request...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                content: 'You are an expert at analyzing educational content and extracting relevant information. You MUST return only valid JSON arrays containing objects with the exact specified structure.'
              },
              { role: 'user', content: prompt }
            ],
            temperature: aiConfig.temperature,
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenAI API error response:', errorText);
          throw new Error(`OpenAI API error: ${response.status}. Details: ${errorText}`);
        }

        const data = await response.json();
        console.log('OpenAI API response received');
        
        if (!data.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from OpenAI API');
        }

        let contentAnalysis;
        try {
          const parsedContent = JSON.parse(data.choices[0].message.content);
          contentAnalysis = Array.isArray(parsedContent) ? parsedContent : parsedContent.mappings || parsedContent.content || [];
          
          if (!Array.isArray(contentAnalysis)) {
            console.error('Unexpected response format:', parsedContent);
            throw new Error('Response is not an array');
          }
        } catch (parseError) {
          console.error('Failed to parse OpenAI response:', data.choices[0].message.content);
          throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
        }

        // Strict validation of each analysis object
        contentAnalysis.forEach((analysis, index) => {
          if (!analysis || typeof analysis !== 'object') {
            console.warn(`Invalid analysis object at index ${index}:`, analysis);
            return;
          }

          const isValid = 
            typeof analysis.content_snippet === 'string' && analysis.content_snippet.trim().length > 0 &&
            typeof analysis.relevance_score === 'number' && analysis.relevance_score >= 0 && analysis.relevance_score <= 1 &&
            typeof analysis.start_index === 'number' && analysis.start_index >= 0 &&
            typeof analysis.end_index === 'number' && analysis.end_index > analysis.start_index;

          if (isValid) {
            mappings.push({
              subject_id: subject.id,
              content_start_index: analysis.start_index,
              content_end_index: analysis.end_index,
              content_snippet: analysis.content_snippet,
              relevance_score: analysis.relevance_score
            });
          } else {
            console.warn('Invalid analysis object structure:', analysis);
            console.warn('Validation details:', {
              hasContentSnippet: typeof analysis.content_snippet === 'string',
              hasValidScore: typeof analysis.relevance_score === 'number' && analysis.relevance_score >= 0 && analysis.relevance_score <= 1,
              hasValidIndices: typeof analysis.start_index === 'number' && typeof analysis.end_index === 'number' && analysis.end_index > analysis.start_index
            });
          }
        });

      } catch (error) {
        console.error(`Error processing subject ${subject.title}:`, error);
        throw error;
      }
    }

    console.log(`Generated ${mappings.length} content mappings`);

    if (mappings.length > 0) {
      console.log('Inserting new mappings...');
      const { error: mappingError } = await supabaseClient
        .from('subject_content_mapping')
        .insert(mappings);

      if (mappingError) throw mappingError;
    }

    return new Response(
      JSON.stringify({ success: true, mappingsCount: mappings.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in map-subject-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

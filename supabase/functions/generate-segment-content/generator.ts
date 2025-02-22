
import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function generateSegmentContent(
  lectureId: number,
  segmentNumber: number,
  retryCount = 0
): Promise<any> {
  try {
    console.log(`Generating content for lecture ${lectureId}, segment ${segmentNumber}`);

    // First, get the lecture content
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture?.content) {
      throw new Error('Failed to fetch lecture content: ' + lectureError?.message);
    }

    // Get the segment description
    const { data: segment, error: segmentError } = await supabase
      .from('lecture_segments')
      .select('title, segment_description')
      .eq('lecture_id', lectureId)
      .eq('sequence_number', segmentNumber)
      .single();

    if (segmentError || !segment) {
      throw new Error('Failed to fetch segment description: ' + segmentError?.message);
    }

    // Extract concepts and aspects from the segment description
    const conceptsMatch = segment.segment_description.match(/Key concepts: (.+)$/);
    if (!conceptsMatch) {
      throw new Error('Invalid segment description format');
    }

    const conceptsList = conceptsMatch[1].split('), ')
      .map(concept => {
        const match = concept.match(/([^(]+) \(([^,]+), ([^)]+)/);
        if (!match) return null;
        return {
          concept: match[1].trim(),
          aspects: [match[2].trim(), match[3].trim()]
        };
      })
      .filter(Boolean);

    // Generate content based on the concepts and aspects
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
            content: `You are an educational content generator. Your task is to create educational content based on specific concepts and their aspects, focusing only on relevant information from the provided lecture content. Generate content in markdown format.`
          },
          {
            role: 'user',
            content: `Using ONLY the information from this lecture content:

${lecture.content}

Create two theory slides and two quiz questions focusing specifically on these concepts and their aspects:
${JSON.stringify(conceptsList, null, 2)}

For each concept, ONLY include information that relates to its specified aspects.

Structure your response as a JSON object with these fields:
- theory_slide_1: First explanatory slide focusing on the first concept
- theory_slide_2: Second explanatory slide focusing on remaining concepts
- quiz_1: A multiple-choice question
- quiz_2: A true/false question

Each quiz should test understanding of the concepts and their specific aspects.`
          }
        ],
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const openAIResponse = await response.json();
    const content = JSON.parse(openAIResponse.choices[0].message.content);

    // Process the quiz content
    const quiz1Parts = content.quiz_1.split('\n');
    const quiz1Options = quiz1Parts.slice(1, -2)
      .map((option: string) => option.replace(/^[A-D]\) /, '').trim())
      .filter((option: string) => option);

    // Insert the generated content
    const { error: insertError } = await supabase
      .from('segments_content')
      .insert({
        lecture_id: lectureId,
        sequence_number: segmentNumber,
        theory_slide_1: content.theory_slide_1,
        theory_slide_2: content.theory_slide_2,
        quiz_1_type: 'multiple_choice',
        quiz_1_question: quiz1Parts[0],
        quiz_1_options: quiz1Options,
        quiz_1_correct_answer: quiz1Options[0], // Assuming first option is correct
        quiz_1_explanation: quiz1Parts[quiz1Parts.length - 1],
        quiz_2_type: 'true_false',
        quiz_2_question: content.quiz_2.split('\n')[0],
        quiz_2_correct_answer: true, // Default to true, OpenAI should specify in response
        quiz_2_explanation: content.quiz_2.split('\n').slice(-1)[0]
      });

    if (insertError) {
      throw new Error('Failed to insert segment content: ' + insertError.message);
    }

    return { success: true };

  } catch (error) {
    console.error(`Error generating content: ${error.message}`);
    if (retryCount < 3) {
      console.log(`Retrying... (${retryCount + 1}/3)`);
      return generateSegmentContent(lectureId, segmentNumber, retryCount + 1);
    }
    throw error;
  }
}

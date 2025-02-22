
import { createClient } from '@supabase/supabase-js';
import { AIConfig } from "./types.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function getLectureContent(lectureId: number, segmentNumber: number) {
  console.log(`Fetching content for lecture ${lectureId}, segment ${segmentNumber}`);

  try {
    // Get lecture content
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('content')
      .eq('id', lectureId)
      .single();

    if (lectureError) {
      console.error('Error fetching lecture:', lectureError);
      throw lectureError;
    }

    // Get segment info
    const { data: segment, error: segmentError } = await supabase
      .from('lecture_segments')
      .select('*')
      .eq('lecture_id', lectureId)
      .eq('sequence_number', segmentNumber)
      .single();

    if (segmentError) {
      console.error('Error fetching segment:', segmentError);
      throw segmentError;
    }

    // Get AI config
    const { data: aiConfig, error: configError } = await supabase
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching AI config:', configError);
      throw configError;
    }

    return {
      content: lecture.content,
      segment,
      config: aiConfig as AIConfig
    };
  } catch (error) {
    console.error('Error in getLectureContent:', error);
    throw error;
  }
}

export async function saveSegmentContent(
  lectureId: number,
  segmentNumber: number,
  content: any
) {
  console.log(`Saving content for lecture ${lectureId}, segment ${segmentNumber}`);

  try {
    const { error } = await supabase
      .from('segments_content')
      .upsert({
        lecture_id: lectureId,
        sequence_number: segmentNumber,
        theory_slide_1: content.theory_slide_1,
        theory_slide_2: content.theory_slide_2,
        quiz_1_type: content.quiz_1_type,
        quiz_1_question: content.quiz_1_question,
        quiz_1_options: content.quiz_1_options,
        quiz_1_correct_answer: content.quiz_1_correct_answer,
        quiz_1_explanation: content.quiz_1_explanation,
        quiz_2_type: content.quiz_2_type,
        quiz_2_question: content.quiz_2_question,
        quiz_2_correct_answer: content.quiz_2_correct_answer,
        quiz_2_explanation: content.quiz_2_explanation
      });

    if (error) {
      console.error('Error saving segment content:', error);
      throw error;
    }

    console.log('Content saved successfully');
  } catch (error) {
    console.error('Error in saveSegmentContent:', error);
    throw error;
  }
}

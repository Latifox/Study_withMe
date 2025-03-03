
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { SegmentContent } from './types.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function insertSegmentContent(
  lectureId: string | number,
  segmentNumber: number,
  content: SegmentContent
): Promise<void> {
  console.log(`Inserting content for regular lecture ${lectureId}, segment ${segmentNumber}`);
  
  try {
    const { error } = await supabase
      .from('segments_content')
      .upsert({
        lecture_id: typeof lectureId === 'string' ? parseInt(lectureId) : lectureId,
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
      console.error('Error inserting segment content:', error);
      throw new Error(`Failed to insert segment content: ${error.message}`);
    }
    
    console.log(`Successfully inserted content for lecture ${lectureId}, segment ${segmentNumber}`);
  } catch (error) {
    console.error('Exception in insertSegmentContent:', error);
    throw error;
  }
}

export async function insertProfessorSegmentContent(
  lectureId: string | number,
  segmentNumber: number,
  content: SegmentContent
): Promise<void> {
  console.log(`Inserting content for professor lecture ${lectureId}, segment ${segmentNumber}`);
  
  try {
    const { error } = await supabase
      .from('professor_segments_content')
      .upsert({
        professor_lecture_id: typeof lectureId === 'string' ? parseInt(lectureId) : lectureId,
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
      console.error('Error inserting professor segment content:', error);
      throw new Error(`Failed to insert professor segment content: ${error.message}`);
    }
    
    console.log(`Successfully inserted content for professor lecture ${lectureId}, segment ${segmentNumber}`);
  } catch (error) {
    console.error('Exception in insertProfessorSegmentContent:', error);
    throw error;
  }
}

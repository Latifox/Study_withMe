
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { SegmentContent } from "./types.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

export async function insertSegmentContent(
  lectureId: number,
  segmentNumber: number,
  content: SegmentContent
) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Prepare data for insertion
  const insertData = {
    lecture_id: lectureId,
    sequence_number: segmentNumber,
    theory_slide_1: content.theorySlide1,
    theory_slide_2: content.theorySlide2,
    quiz_1_type: content.quiz1.type,
    quiz_1_question: content.quiz1.question,
    quiz_1_options: content.quiz1.options,
    quiz_1_correct_answer: content.quiz1.correctAnswer,
    quiz_1_explanation: content.quiz1.explanation,
    quiz_2_type: content.quiz2.type,
    quiz_2_question: content.quiz2.question,
    quiz_2_correct_answer: content.quiz2.correctAnswer === 'true',
    quiz_2_explanation: content.quiz2.explanation
  };

  console.log(`Inserting content for segment ${segmentNumber} into segments_content...`);
  
  const { data, error } = await supabase
    .from('segments_content')
    .insert(insertData)
    .select();

  if (error) {
    console.error('Error inserting segment content:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  console.log(`Segment ${segmentNumber} content inserted successfully:`, data);
  return data;
}

export async function insertProfessorSegmentContent(
  lectureId: number,
  segmentNumber: number,
  content: SegmentContent
) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Prepare data for insertion
  const insertData = {
    lecture_id: lectureId,
    sequence_number: segmentNumber,
    theory_slide_1: content.theorySlide1,
    theory_slide_2: content.theorySlide2,
    quiz_1_type: content.quiz1.type,
    quiz_1_question: content.quiz1.question,
    quiz_1_options: content.quiz1.options,
    quiz_1_correct_answer: content.quiz1.correctAnswer,
    quiz_1_explanation: content.quiz1.explanation,
    quiz_2_type: content.quiz2.type,
    quiz_2_question: content.quiz2.question,
    quiz_2_correct_answer: content.quiz2.correctAnswer === 'true',
    quiz_2_explanation: content.quiz2.explanation
  };

  console.log(`Inserting content for segment ${segmentNumber} into professor_segments_content...`);
  
  const { data, error } = await supabase
    .from('professor_segments_content')
    .insert(insertData)
    .select();

  if (error) {
    console.error('Error inserting professor segment content:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  console.log(`Professor segment ${segmentNumber} content inserted successfully:`, data);
  return data;
}

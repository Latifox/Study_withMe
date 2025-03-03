
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export async function updateSegmentContent(
  lectureId: number | string,
  segmentNumber: number | string,
  content: any,
  isProfessorLecture: boolean = false
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const table = isProfessorLecture ? 'professor_segments_content' : 'segments_content';
  
  console.log(`Updating ${table} for lecture ${lectureId}, segment ${segmentNumber}`);

  try {
    const { error } = await supabase
      .from(table)
      .upsert({
        lecture_id: Number(lectureId),
        sequence_number: Number(segmentNumber),
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
      console.error("DB update error:", error);
      throw new Error(`Failed to update ${table}: ${error.message}`);
    }
    
    console.log(`Successfully updated ${table}`);
  } catch (error) {
    console.error("Error in updateSegmentContent:", error);
    throw error;
  }
}

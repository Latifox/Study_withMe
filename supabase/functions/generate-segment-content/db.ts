
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import type { SegmentContent } from "./types.ts";

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function insertSegmentContent(
  lectureId: string | number,
  segmentNumber: string | number,
  content: SegmentContent
): Promise<void> {
  console.log(`Inserting content for lecture ${lectureId}, segment ${segmentNumber}`);
  
  // Convert string IDs to numbers if necessary
  const numericLectureId = typeof lectureId === "string" ? parseInt(lectureId, 10) : lectureId;
  const numericSegmentNumber = typeof segmentNumber === "string" ? parseInt(segmentNumber, 10) : segmentNumber;
  
  // Format content for database insertion
  const contentToInsert = {
    lecture_id: numericLectureId,
    sequence_number: numericSegmentNumber,
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
  };

  // Insert or update the content in the segments_content table
  const { error } = await supabase
    .from("segments_content")
    .upsert(contentToInsert);

  if (error) {
    console.error("Error inserting segment content:", error);
    throw new Error(`Failed to insert segment content: ${error.message}`);
  }
  
  console.log("Segment content inserted successfully");
}

export async function insertProfessorSegmentContent(
  lectureId: string | number,
  segmentNumber: string | number,
  content: SegmentContent
): Promise<void> {
  console.log(`Inserting professor content for lecture ${lectureId}, segment ${segmentNumber}`);
  
  // Convert string IDs to numbers if necessary
  const numericLectureId = typeof lectureId === "string" ? parseInt(lectureId, 10) : lectureId;
  const numericSegmentNumber = typeof segmentNumber === "string" ? parseInt(segmentNumber, 10) : segmentNumber;
  
  // Format content for database insertion
  const contentToInsert = {
    professor_lecture_id: numericLectureId,
    sequence_number: numericSegmentNumber,
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
  };

  // Insert or update the content in the professor_segments_content table
  const { error } = await supabase
    .from("professor_segments_content")
    .upsert(contentToInsert);

  if (error) {
    console.error("Error inserting professor segment content:", error);
    throw new Error(`Failed to insert professor segment content: ${error.message}`);
  }
  
  console.log("Professor segment content inserted successfully");
}

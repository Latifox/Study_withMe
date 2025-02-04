import { supabase } from "@/integrations/supabase/client";
import { QuizScore } from "@/types/quiz";

export const saveQuizProgress = async (
  userId: string,
  lectureId: number,
  segmentNumber: number,
  quizNumber: number,
  quizScore: number
) => {
  const { error } = await supabase
    .from('quiz_progress')
    .upsert({
      user_id: userId,
      lecture_id: lectureId,
      segment_number: segmentNumber,
      quiz_number: quizNumber,
      completed_at: new Date().toISOString(),
      quiz_score: quizScore
    }, {
      onConflict: 'user_id,lecture_id,segment_number,quiz_number'
    });

  if (error) throw error;
};

export const getSegmentQuizScores = async (
  userId: string,
  lectureId: number,
  segmentNumber: number
): Promise<QuizScore[]> => {
  const { data, error } = await supabase
    .from('quiz_progress')
    .select('quiz_score')
    .eq('user_id', userId)
    .eq('lecture_id', lectureId)
    .eq('segment_number', segmentNumber);

  if (error) throw error;
  return data;
};

export const updateUserProgress = async (
  userId: string,
  lectureId: number,
  segmentNumber: number,
  totalScore: number
) => {
  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      lecture_id: lectureId,
      segment_number: segmentNumber,
      score: totalScore,
      completed_at: totalScore >= 10 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,lecture_id,segment_number'
    });

  if (error) throw error;
};
import { supabase } from "@/integrations/supabase/client";
import { calculateNewScore, MAX_SCORE } from "@/utils/scoreUtils";

interface QuizProgressHandlerProps {
  userId: string;
  lectureId: number;
  segmentNumber: number;
  quizNumber: number;
  onSuccess: (newScore: number) => void;
  onError: () => void;
}

export const handleQuizProgress = async ({
  userId,
  lectureId,
  segmentNumber,
  quizNumber,
  onSuccess,
  onError,
}: QuizProgressHandlerProps) => {
  try {
    // Check if quiz was already completed
    const { data: existingQuizProgress } = await supabase
      .from('quiz_progress')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('lecture_id', lectureId)
      .eq('segment_number', segmentNumber)
      .eq('quiz_number', quizNumber)
      .maybeSingle();

    const quizAlreadyCompleted = !!existingQuizProgress?.completed_at;

    // Record quiz completion if not already completed
    if (!quizAlreadyCompleted) {
      const { error: quizProgressError } = await supabase
        .from('quiz_progress')
        .insert({
          user_id: userId,
          lecture_id: lectureId,
          segment_number: segmentNumber,
          quiz_number: quizNumber,
          completed_at: new Date().toISOString()
        });

      if (quizProgressError) {
        console.error('Error saving quiz progress:', quizProgressError);
        onError();
        return;
      }
    }

    // Get current score
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('score')
      .eq('user_id', userId)
      .eq('lecture_id', lectureId)
      .eq('segment_number', segmentNumber)
      .maybeSingle();

    const currentScore = existingProgress?.score || 0;
    const newScore = calculateNewScore(currentScore, quizAlreadyCompleted);

    // Update progress
    const { error: updateError } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        lecture_id: lectureId,
        segment_number: segmentNumber,
        score: newScore,
        completed_at: newScore >= MAX_SCORE ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      });

    if (updateError) {
      console.error('Error updating progress:', updateError);
      onError();
      return;
    }

    onSuccess(newScore);

  } catch (error) {
    console.error('Error in quiz progress handler:', error);
    onError();
  }
};
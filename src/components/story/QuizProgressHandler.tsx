import { supabase } from "@/integrations/supabase/client";
import { POINTS_PER_CORRECT_ANSWER, MAX_SCORE } from "@/utils/scoreUtils";

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
    console.log('Handling quiz progress for:', { userId, lectureId, segmentNumber, quizNumber });

    // Check if quiz was already completed
    const { data: existingQuizProgress, error: quizError } = await supabase
      .from('quiz_progress')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('lecture_id', lectureId)
      .eq('segment_number', segmentNumber)
      .eq('quiz_number', quizNumber)
      .maybeSingle();

    if (quizError) {
      console.error('Error checking quiz progress:', quizError);
      onError();
      return;
    }

    const quizAlreadyCompleted = !!existingQuizProgress?.completed_at;
    console.log('Quiz already completed:', quizAlreadyCompleted);

    // If quiz is already completed, return current score without updating
    if (quizAlreadyCompleted) {
      const { data: currentProgress } = await supabase
        .from('user_progress')
        .select('score')
        .eq('user_id', userId)
        .eq('lecture_id', lectureId)
        .eq('segment_number', segmentNumber)
        .maybeSingle();

      onSuccess(currentProgress?.score || 0);
      return;
    }

    // Get current progress
    const { data: existingProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('score')
      .eq('user_id', userId)
      .eq('lecture_id', lectureId)
      .eq('segment_number', segmentNumber)
      .maybeSingle();

    if (progressError) {
      console.error('Error fetching existing progress:', progressError);
      onError();
      return;
    }

    // Calculate new score
    const currentScore = existingProgress?.score || 0;
    const newScore = Math.min(currentScore + POINTS_PER_CORRECT_ANSWER, MAX_SCORE);
    console.log('Score calculation:', { currentScore, newScore });

    // Record quiz completion first
    const { error: quizProgressError } = await supabase
      .from('quiz_progress')
      .upsert({
        user_id: userId,
        lecture_id: lectureId,
        segment_number: segmentNumber,
        quiz_number: quizNumber,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lecture_id,segment_number,quiz_number',
        ignoreDuplicates: false
      });

    if (quizProgressError) {
      console.error('Error saving quiz progress:', quizProgressError);
      onError();
      return;
    }

    // Update user progress with explicit onConflict handling
    const { error: upsertError } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        lecture_id: lectureId,
        segment_number: segmentNumber,
        score: newScore,
        completed_at: newScore >= MAX_SCORE ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lecture_id,segment_number',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Error updating progress:', upsertError);
      onError();
      return;
    }

    console.log('Successfully updated progress with new score:', newScore);
    onSuccess(newScore);

  } catch (error) {
    console.error('Error in quiz progress handler:', error);
    onError();
  }
};
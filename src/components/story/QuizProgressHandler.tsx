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

    // Record quiz completion if not already completed
    if (!quizAlreadyCompleted) {
      const { error: quizProgressError } = await supabase
        .from('quiz_progress')
        .upsert({
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

    console.log('Existing progress:', existingProgress);
    const currentScore = existingProgress?.score || 0;
    const newScore = calculateNewScore(currentScore, quizAlreadyCompleted);
    console.log('Score calculation:', { currentScore, newScore, quizAlreadyCompleted });

    // Check if user progress exists
    if (existingProgress) {
      // Update existing progress
      const { error: updateError } = await supabase
        .from('user_progress')
        .update({
          score: newScore,
          completed_at: newScore >= MAX_SCORE ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('lecture_id', lectureId)
        .eq('segment_number', segmentNumber);

      if (updateError) {
        console.error('Error updating progress:', updateError);
        onError();
        return;
      }
    } else {
      // Insert new progress
      const { error: insertError } = await supabase
        .from('user_progress')
        .insert({
          user_id: userId,
          lecture_id: lectureId,
          segment_number: segmentNumber,
          score: newScore,
          completed_at: newScore >= MAX_SCORE ? new Date().toISOString() : null
        });

      if (insertError) {
        console.error('Error inserting progress:', insertError);
        onError();
        return;
      }
    }

    console.log('Successfully updated progress with new score:', newScore);
    onSuccess(newScore);

  } catch (error) {
    console.error('Error in quiz progress handler:', error);
    onError();
  }
};
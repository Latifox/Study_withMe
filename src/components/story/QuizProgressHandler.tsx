import { supabase } from "@/integrations/supabase/client";

interface QuizProgressHandlerProps {
  userId: string;
  lectureId: number;
  segmentNumber: number;
  quizNumber: number;
  isCorrect: boolean;
  onSuccess: (newScore: number) => void;
  onError: () => void;
}

export const handleQuizProgress = async ({
  userId,
  lectureId,
  segmentNumber,
  quizNumber,
  isCorrect,
  onSuccess,
  onError,
}: QuizProgressHandlerProps) => {
  try {
    console.log('Handling quiz progress for:', { userId, lectureId, segmentNumber, quizNumber, isCorrect });

    // Calculate quiz score based on correctness
    const quizScore = isCorrect ? 5 : 0;

    // Record quiz completion with score
    const { error: quizProgressError } = await supabase
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

    if (quizProgressError) {
      console.error('Error saving quiz progress:', quizProgressError);
      onError();
      return;
    }

    // Get total segment score by summing quiz scores
    const { data: quizScores, error: scoresError } = await supabase
      .from('quiz_progress')
      .select('quiz_score')
      .eq('user_id', userId)
      .eq('lecture_id', lectureId)
      .eq('segment_number', segmentNumber);

    if (scoresError) {
      console.error('Error fetching quiz scores:', scoresError);
      onError();
      return;
    }

    const totalScore = quizScores.reduce((sum, quiz) => sum + (quiz.quiz_score || 0), 0);
    console.log('Total segment score:', totalScore);

    // Update user progress with total score
    const { error: upsertError } = await supabase
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

    if (upsertError) {
      console.error('Error updating progress:', upsertError);
      onError();
      return;
    }

    console.log('Successfully updated progress with new score:', totalScore);
    onSuccess(totalScore);

  } catch (error) {
    console.error('Error in quiz progress handler:', error);
    onError();
  }
};
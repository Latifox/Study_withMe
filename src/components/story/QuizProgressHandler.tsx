import { QuizProgressHandlerProps } from "@/types/quiz";
import { 
  saveQuizProgress, 
  getSegmentQuizScores, 
  updateUserProgress 
} from "@/services/quizProgressService";

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

    // Calculate and save quiz score
    const quizScore = isCorrect ? 5 : 0;
    await saveQuizProgress(userId, lectureId, segmentNumber, quizNumber, quizScore);

    // Get total segment score
    const quizScores = await getSegmentQuizScores(userId, lectureId, segmentNumber);
    const totalScore = quizScores.reduce((sum, quiz) => sum + (quiz.quiz_score || 0), 0);
    console.log('Total segment score:', totalScore);

    // Update user progress
    await updateUserProgress(userId, lectureId, segmentNumber, totalScore);

    console.log('Successfully updated progress with new score:', totalScore);
    onSuccess(totalScore);

  } catch (error) {
    console.error('Error in quiz progress handler:', error);
    onError();
  }
};
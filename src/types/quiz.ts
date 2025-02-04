export interface QuizProgressHandlerProps {
  userId: string;
  lectureId: number;
  segmentNumber: number;
  quizNumber: number;
  isCorrect: boolean;
  onSuccess: (newScore: number) => void;
  onError: () => void;
}

export interface QuizScore {
  quiz_score: number;
}
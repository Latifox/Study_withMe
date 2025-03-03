
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

export interface Question {
  question: string;
  type: "multiple_choice" | "true_false";
  options: string[];
  correctAnswer: string;
  hint?: string;
}

export interface QuizResponse {
  quiz: Question[];
  quizId?: number;
}

export interface QuizData {
  quiz: Question[];
}

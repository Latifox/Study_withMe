

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

// Helper function to check if a value matches the QuizData interface
export function isQuizData(value: unknown): value is QuizData {
  return (
    typeof value === 'object' && 
    value !== null && 
    'quiz' in value && 
    Array.isArray((value as any).quiz)
  );
}



export interface QuizQuestion {
  type: "multiple_choice" | "true_false";
  question: string;
  options?: string[];
  correctAnswer: string | boolean;
  explanation: string;
}

export interface GeneratedContent {
  theory_slide_1: string;
  theory_slide_2: string;
  quiz_question_1: QuizQuestion;
  quiz_question_2: QuizQuestion;
}

export interface SegmentRequest {
  lectureId: number;
  segmentNumber: number;
  segmentTitle: string;
}

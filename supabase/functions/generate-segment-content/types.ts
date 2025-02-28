
export interface SegmentContent {
  theory_slide_1: string;
  theory_slide_2: string;
  quiz_1_type: string;
  quiz_1_question: string;
  quiz_1_options?: string[];
  quiz_1_correct_answer: string;
  quiz_1_explanation: string;
  quiz_2_type: string;
  quiz_2_question: string;
  quiz_2_correct_answer: boolean;
  quiz_2_explanation: string;
}

export interface ApiResponse {
  success: boolean;
  content?: SegmentContent;
  error?: string;
}

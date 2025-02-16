
export interface GeneratedContent {
  theory_slide_1: string;
  theory_slide_2: string;
  quiz_1_type: 'multiple_choice' | 'true_false';
  quiz_1_question: string;
  quiz_1_options?: string[];
  quiz_1_correct_answer: string | boolean;
  quiz_1_explanation: string;
  quiz_2_type: 'multiple_choice' | 'true_false';
  quiz_2_question: string;
  quiz_2_correct_answer: boolean;
  quiz_2_explanation: string;
}

export interface SegmentRequest {
  lectureId: number;
  segmentNumber: number;
}

export interface AIConfig {
  temperature: number;
  creativity_level: number;
  detail_level: number;
  custom_instructions?: string;
  content_language?: string;
}

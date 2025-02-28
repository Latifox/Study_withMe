
import { SegmentContent } from './types.ts';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSegmentContent(content: SegmentContent): ValidationResult {
  const errors: string[] = [];

  // Check theory slides
  if (!content.theory_slide_1 || typeof content.theory_slide_1 !== 'string' || content.theory_slide_1.length < 10) {
    errors.push('Theory slide 1 is missing or too short');
  }

  if (!content.theory_slide_2 || typeof content.theory_slide_2 !== 'string' || content.theory_slide_2.length < 10) {
    errors.push('Theory slide 2 is missing or too short');
  }

  // Check quiz 1
  if (!content.quiz_1_type || !['multiple_choice', 'true_false'].includes(content.quiz_1_type)) {
    errors.push('Quiz 1 type is missing or invalid');
  }

  if (!content.quiz_1_question || typeof content.quiz_1_question !== 'string' || content.quiz_1_question.length < 5) {
    errors.push('Quiz 1 question is missing or too short');
  }

  if (content.quiz_1_type === 'multiple_choice') {
    if (!Array.isArray(content.quiz_1_options) || content.quiz_1_options.length < 2) {
      errors.push('Quiz 1 options are missing or invalid');
    }

    if (!content.quiz_1_correct_answer || typeof content.quiz_1_correct_answer !== 'string') {
      errors.push('Quiz 1 correct answer is missing or invalid');
    } else {
      // Check if the correct answer is in the options
      if (Array.isArray(content.quiz_1_options) && 
          !content.quiz_1_options.some(option => option === content.quiz_1_correct_answer)) {
        errors.push('Quiz 1 correct answer is not in the options');
      }
    }
  }

  if (!content.quiz_1_explanation || typeof content.quiz_1_explanation !== 'string' || content.quiz_1_explanation.length < 5) {
    errors.push('Quiz 1 explanation is missing or too short');
  }

  // Check quiz 2
  if (!content.quiz_2_type || !['multiple_choice', 'true_false'].includes(content.quiz_2_type)) {
    errors.push('Quiz 2 type is missing or invalid');
  }

  if (!content.quiz_2_question || typeof content.quiz_2_question !== 'string' || content.quiz_2_question.length < 5) {
    errors.push('Quiz 2 question is missing or too short');
  }

  if (content.quiz_2_type === 'true_false') {
    if (typeof content.quiz_2_correct_answer !== 'boolean') {
      errors.push('Quiz 2 correct answer is not a boolean');
    }
  }

  if (!content.quiz_2_explanation || typeof content.quiz_2_explanation !== 'string' || content.quiz_2_explanation.length < 5) {
    errors.push('Quiz 2 explanation is missing or too short');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

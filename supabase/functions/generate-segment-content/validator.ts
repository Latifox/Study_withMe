
import { GeneratedContent } from "./types.ts";

const validateContent = (content: GeneratedContent): void => {
  const requiredFields = [
    'theory_slide_1',
    'theory_slide_2',
    'quiz_1_type',
    'quiz_1_question',
    'quiz_1_options',
    'quiz_1_correct_answer',
    'quiz_1_explanation',
    'quiz_2_type',
    'quiz_2_question',
    'quiz_2_correct_answer',
    'quiz_2_explanation'
  ];

  const missingFields = requiredFields.filter(field => {
    if (field === 'quiz_1_options') {
      return content.quiz_1_type === 'multiple_choice' && (!Array.isArray(content.quiz_1_options) || content.quiz_1_options.length < 2);
    }
    return !content[field];
  });

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate quiz types
  if (!['multiple_choice', 'true_false'].includes(content.quiz_1_type)) {
    throw new Error('Quiz 1 type must be either "multiple_choice" or "true_false"');
  }

  if (!['multiple_choice', 'true_false'].includes(content.quiz_2_type)) {
    throw new Error('Quiz 2 type must be either "multiple_choice" or "true_false"');
  }

  // Multiple choice validation
  if (content.quiz_1_type === 'multiple_choice') {
    if (!Array.isArray(content.quiz_1_options) || content.quiz_1_options.length < 4) {
      throw new Error('Multiple choice quiz 1 must have at least 4 options');
    }
    if (!content.quiz_1_options.includes(content.quiz_1_correct_answer)) {
      throw new Error('Quiz 1 correct answer must match one of the options');
    }
  }

  // True/false validation
  if (content.quiz_1_type === 'true_false' && typeof content.quiz_1_correct_answer !== 'boolean') {
    throw new Error('True/false quiz 1 must have a boolean correct answer');
  }

  if (content.quiz_2_type === 'true_false' && typeof content.quiz_2_correct_answer !== 'boolean') {
    throw new Error('True/false quiz 2 must have a boolean correct answer');
  }

  // Validate question and explanation lengths
  if (content.quiz_1_question.length <= 10) {
    throw new Error('Quiz 1 question must be longer than 10 characters');
  }

  if (content.quiz_2_question.length <= 10) {
    throw new Error('Quiz 2 question must be longer than 10 characters');
  }

  if (content.quiz_1_explanation.length <= 20) {
    throw new Error('Quiz 1 explanation must be longer than 20 characters');
  }

  if (content.quiz_2_explanation.length <= 20) {
    throw new Error('Quiz 2 explanation must be longer than 20 characters');
  }
};

export { validateContent };

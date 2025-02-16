
import { GeneratedContent, QuizQuestion } from "./types.ts";

export const validateQuizQuestion = (question: any, type: string): void => {
  if (!question.type || !question.question || !question.explanation) {
    throw new Error(`Invalid ${type} question structure: missing required fields`);
  }
  
  if (question.type === 'multiple_choice') {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error('Multiple choice question must have at least 2 options');
    }
    if (!question.options.includes(question.correctAnswer)) {
      throw new Error('Correct answer must be one of the options');
    }
  } else if (question.type === 'true_false') {
    if (typeof question.correctAnswer !== 'boolean') {
      throw new Error('True/False question must have a boolean correct answer');
    }
  }
};

export const validateContent = (content: GeneratedContent): void => {
  // Validate required fields
  const requiredFields = ['theory_slide_1', 'theory_slide_2', 'quiz_question_1', 'quiz_question_2'];
  const missingFields = requiredFields.filter(field => !content[field as keyof GeneratedContent]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate theory slides
  if (typeof content.theory_slide_1 !== 'string' || content.theory_slide_1.length < 100) {
    throw new Error('Theory slide 1 content is invalid or too short');
  }
  if (typeof content.theory_slide_2 !== 'string' || content.theory_slide_2.length < 100) {
    throw new Error('Theory slide 2 content is invalid or too short');
  }

  validateQuizQuestion(content.quiz_question_1, 'multiple_choice');
  validateQuizQuestion(content.quiz_question_2, 'true_false');
};

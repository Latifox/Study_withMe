
import { GeneratedContent, QuizQuestion } from "./types.ts";

export const validateQuizQuestion = (content: any, quizNumber: number): void => {
  const typeField = `quiz_${quizNumber}_type`;
  const questionField = `quiz_${quizNumber}_question`;
  const correctAnswerField = `quiz_${quizNumber}_correct_answer`;
  const explanationField = `quiz_${quizNumber}_explanation`;
  const optionsField = `quiz_${quizNumber}_options`;

  if (!content[typeField] || !content[questionField] || !content[correctAnswerField] || !content[explanationField]) {
    throw new Error(`Invalid quiz ${quizNumber} structure: missing required fields`);
  }
  
  if (content[typeField] === 'multiple_choice') {
    if (!Array.isArray(content[optionsField]) || content[optionsField].length < 2) {
      throw new Error(`Quiz ${quizNumber} must have at least 2 options`);
    }
    if (!content[optionsField].includes(content[correctAnswerField])) {
      throw new Error(`Quiz ${quizNumber} correct answer must be one of the options`);
    }
  } else if (content[typeField] === 'true_false') {
    if (typeof content[correctAnswerField] !== 'boolean') {
      throw new Error(`Quiz ${quizNumber} must have a boolean correct answer`);
    }
  }
};

export const validateContent = (content: GeneratedContent): void => {
  // Validate required fields
  const requiredFields = ['theory_slide_1', 'theory_slide_2'];
  const missingFields = requiredFields.filter(field => !content[field as keyof GeneratedContent]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate theory slides
  if (typeof content.theory_slide_1 !== 'string' || content.theory_slide_1.length < 10) {
    throw new Error('Theory slide 1 content is invalid or too short');
  }
  if (typeof content.theory_slide_2 !== 'string' || content.theory_slide_2.length < 10) {
    throw new Error('Theory slide 2 content is invalid or too short');
  }

  // Validate both quizzes
  validateQuizQuestion(content, 1);
  validateQuizQuestion(content, 2);
};

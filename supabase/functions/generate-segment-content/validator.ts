
import { GeneratedContent } from "./types.ts";

export const validateQuizQuestion = (content: GeneratedContent, quizNumber: number): void => {
  const prefix = `quiz_${quizNumber}_`;
  const type = content[`${prefix}type` as keyof GeneratedContent] as string;
  const question = content[`${prefix}question` as keyof GeneratedContent] as string;
  const explanation = content[`${prefix}explanation` as keyof GeneratedContent] as string;
  const correctAnswer = content[`${prefix}correct_answer` as keyof GeneratedContent];
  const options = content[`${prefix}options` as keyof GeneratedContent];

  if (!type || !question || !explanation) {
    throw new Error(`Invalid quiz ${quizNumber} structure: missing required fields`);
  }
  
  if (type === 'multiple_choice') {
    if (!Array.isArray(options) || options.length < 2) {
      throw new Error(`Quiz ${quizNumber} must have at least 2 options`);
    }
    if (!options.includes(correctAnswer as string)) {
      throw new Error(`Quiz ${quizNumber} correct answer must be one of the options`);
    }
  } else if (type === 'true_false') {
    if (typeof correctAnswer !== 'boolean') {
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

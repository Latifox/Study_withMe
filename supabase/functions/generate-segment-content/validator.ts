
import { GeneratedContent } from "./types.ts";

export const validateQuizQuestion = (content: GeneratedContent, quizNumber: 1 | 2): void => {
  const typeField = `quiz_${quizNumber}_type` as const;
  const questionField = `quiz_${quizNumber}_question` as const;
  const correctAnswerField = `quiz_${quizNumber}_correct_answer` as const;
  const explanationField = `quiz_${quizNumber}_explanation` as const;
  const optionsField = `quiz_${quizNumber}_options` as const;

  if (!content[typeField] || !content[questionField] || !content[explanationField]) {
    throw new Error(`Invalid quiz ${quizNumber} structure: missing required fields`);
  }
  
  if (content[typeField] === 'multiple_choice') {
    if (!Array.isArray(content[optionsField]) || (content[optionsField]?.length || 0) < 2) {
      throw new Error(`Quiz ${quizNumber} must have at least 2 options`);
    }
    if (!content[optionsField]?.includes(content[correctAnswerField].toString())) {
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
  if (!content.theory_slide_1 || !content.theory_slide_2) {
    throw new Error('Missing required theory slides');
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

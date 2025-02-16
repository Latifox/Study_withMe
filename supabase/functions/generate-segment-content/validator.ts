
import { GeneratedContent } from "./types.ts";

const MIN_WORDS = 400;
const MAX_WORDS = 600;

const wordCount = (text: string): number => {
  return text.trim().split(/\s+/).length;
};

const validateWordCount = (text: string, fieldName: string): void => {
  const words = wordCount(text);
  if (words < MIN_WORDS || words > MAX_WORDS) {
    throw new Error(`${fieldName} must be between ${MIN_WORDS} and ${MAX_WORDS} words. Current: ${words} words`);
  }
};

const validateMarkdownAndLatex = (text: string, fieldName: string): void => {
  // Check for basic markdown elements
  const hasMarkdown = /[#*_`]/.test(text) || /\n[-*+]/.test(text);
  if (!hasMarkdown) {
    console.warn(`Warning: ${fieldName} might be missing markdown formatting`);
  }

  // Check for proper LaTeX delimiters if math is present
  const mathPattern = /[+\-*/=<>√∑∏∫]/;
  if (mathPattern.test(text) && !(/\$.*\$/.test(text))) {
    throw new Error(`${fieldName} contains mathematical symbols but lacks LaTeX formatting`);
  }
};

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

  // Validate explanation formatting
  validateMarkdownAndLatex(explanation, `Quiz ${quizNumber} explanation`);
};

export const validateContent = (content: GeneratedContent): void => {
  // Validate required fields
  const requiredFields = ['theory_slide_1', 'theory_slide_2'];
  const missingFields = requiredFields.filter(field => !content[field as keyof GeneratedContent]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate theory slides
  for (const slideNumber of [1, 2]) {
    const slideContent = content[`theory_slide_${slideNumber}` as keyof GeneratedContent] as string;
    
    if (typeof slideContent !== 'string') {
      throw new Error(`Theory slide ${slideNumber} content must be a string`);
    }

    // Validate word count
    validateWordCount(slideContent, `Theory slide ${slideNumber}`);

    // Validate formatting
    validateMarkdownAndLatex(slideContent, `Theory slide ${slideNumber}`);
  }

  // Validate both quizzes
  validateQuizQuestion(content, 1);
  validateQuizQuestion(content, 2);
};

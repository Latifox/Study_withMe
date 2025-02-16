import { GeneratedContent } from "./types.ts";

const MIN_WORDS = 300;
const MAX_WORDS = 400;

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

  // Define mathematical symbols and patterns that should be in LaTeX
  const mathPatterns = [
    /[+\-*/=<>≤≥≠∑∏∫√]/,  // Basic operators and symbols
    /[α-ωΑ-Ω]/,           // Greek letters
    /\b\d+\/\d+\b/,       // Fractions like 1/2
    /\b[a-z]\^[0-9]/i,    // Basic exponents like x^2
    /\b[a-z]\([a-z]\)/i,  // Function notation like f(x)
    /\bdx\b|\bdy\b/,      // Differential notation
    /∞|±|×|÷|∂|∇|∆/      // Special math symbols
  ];

  // Check if the text contains any mathematical patterns
  const hasMathPatterns = mathPatterns.some(pattern => pattern.test(text));

  if (hasMathPatterns) {
    // Look for proper LaTeX delimiters
    const hasInlineLaTeX = /\$[^$]+\$/.test(text);
    const hasDisplayLaTeX = /\$\$[^$]+\$\$/.test(text);

    if (!hasInlineLaTeX && !hasDisplayLaTeX) {
      console.error(`Mathematical content found in ${fieldName} without LaTeX formatting`);
      console.error('Mathematical patterns detected:', 
        mathPatterns
          .filter(pattern => pattern.test(text))
          .map(pattern => text.match(pattern)?.[0])
          .filter(Boolean)
      );
      throw new Error(`${fieldName} contains mathematical symbols but lacks LaTeX formatting`);
    }
  }
};

const validateQuizQuestion = (content: GeneratedContent, quizNumber: number): void => {
  const prefix = `quiz_${quizNumber}_`;
  const requiredFields = ['type', 'question', 'explanation', 'correct_answer'];
  
  // Check for missing required fields
  const missingFields = requiredFields.filter(field => {
    const value = content[`${prefix}${field}` as keyof GeneratedContent];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw new Error(
      `Quiz ${quizNumber} is missing required fields: ${missingFields.join(', ')}. ` +
      `All quizzes must include: type, question, explanation, and correct_answer.`
    );
  }

  const type = content[`${prefix}type` as keyof GeneratedContent] as string;
  const question = content[`${prefix}question` as keyof GeneratedContent] as string;
  const explanation = content[`${prefix}explanation` as keyof GeneratedContent] as string;
  const correctAnswer = content[`${prefix}correct_answer` as keyof GeneratedContent];
  const options = content[`${prefix}options` as keyof GeneratedContent];

  // Validate quiz type
  if (type !== 'multiple_choice' && type !== 'true_false') {
    throw new Error(`Quiz ${quizNumber} type must be either 'multiple_choice' or 'true_false', got: ${type}`);
  }
  
  // Validate question format
  if (typeof question !== 'string' || question.length < 10) {
    throw new Error(`Quiz ${quizNumber} question must be a string of at least 10 characters`);
  }

  // Validate explanation format
  if (typeof explanation !== 'string' || explanation.length < 20) {
    throw new Error(`Quiz ${quizNumber} explanation must be a string of at least 20 characters`);
  }
  
  if (type === 'multiple_choice') {
    if (!Array.isArray(options) || options.length < 2) {
      throw new Error(`Quiz ${quizNumber} must have at least 2 options for multiple choice type`);
    }
    if (typeof correctAnswer !== 'string') {
      throw new Error(`Quiz ${quizNumber} correct answer must be a string for multiple choice type`);
    }
    if (!options.includes(correctAnswer)) {
      throw new Error(`Quiz ${quizNumber} correct answer must be one of the options`);
    }
  } else if (type === 'true_false') {
    if (typeof correctAnswer !== 'boolean') {
      throw new Error(`Quiz ${quizNumber} must have a boolean correct answer for true/false type`);
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

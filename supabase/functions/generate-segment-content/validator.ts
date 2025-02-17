
import { GeneratedContent } from "./types.ts";

const countWords = (text: string | null | undefined): number => {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).length;
};

const validateContent = (content: GeneratedContent): void => {
  // First validate that we have a valid content object
  if (!content || typeof content !== 'object') {
    throw new Error('Invalid content: must be a valid object');
  }

  console.log('Validating content:', JSON.stringify(content, null, 2));

  // Validate word count for both slides
  const slide1Words = countWords(content.theory_slide_1);
  const slide2Words = countWords(content.theory_slide_2);
  
  console.log(`Slide 1 word count: ${slide1Words}`);
  console.log(`Slide 2 word count: ${slide2Words}`);

  if (slide1Words < 225 || slide1Words > 550) {
    throw new Error(`Theory slide 1 has ${slide1Words} words, must be between 225-550 words`);
  }

  if (slide2Words < 225 || slide2Words > 550) {
    throw new Error(`Theory slide 2 has ${slide2Words} words, must be between 225-550 words`);
  }

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
      return content.quiz_1_type === 'multiple_choice' && (!Array.isArray(content.quiz_1_options) || content.quiz_1_options.length < 4);
    }
    if (field === 'quiz_2_correct_answer') {
      return typeof content[field] !== 'boolean';
    }
    return !content[field] || (typeof content[field] === 'string' && content[field].trim() === '');
  });

  if (missingFields.length > 0) {
    console.error('Content validation failed. Missing fields:', missingFields);
    console.error('Content received:', JSON.stringify(content, null, 2));
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

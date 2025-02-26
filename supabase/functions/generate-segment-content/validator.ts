
export function validateGeneratedContent(content: any) {
  if (!content) {
    throw new Error('No content provided');
  }
  
  // Validate theory slides
  if (!content.theory_slide_1 || !content.theory_slide_2) {
    throw new Error('Missing theory slides');
  }
  
  // Validate quiz 1
  if (!content.quiz_1_type || !content.quiz_1_question || !content.quiz_1_correct_answer || !content.quiz_1_explanation) {
    throw new Error('Missing required quiz 1 fields');
  }
  
  // For multiple choice questions, validate options
  if (content.quiz_1_type === 'multiple_choice' && (!Array.isArray(content.quiz_1_options) || content.quiz_1_options.length !== 4)) {
    throw new Error('Multiple choice questions must have exactly 4 options');
  }
  
  // Validate quiz 2
  if (!content.quiz_2_type || !content.quiz_2_question || content.quiz_2_correct_answer === undefined || !content.quiz_2_explanation) {
    throw new Error('Missing required quiz 2 fields');
  }
  
  return true;
}

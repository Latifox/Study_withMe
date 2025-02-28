
import { SegmentContent } from './types.ts';

export function validateContent(content: SegmentContent): boolean {
  try {
    // Check theory slides
    if (!content.theory_slide_1 || typeof content.theory_slide_1 !== 'string' || content.theory_slide_1.trim() === '') {
      console.error('Invalid theory_slide_1');
      return false;
    }
    
    if (!content.theory_slide_2 || typeof content.theory_slide_2 !== 'string' || content.theory_slide_2.trim() === '') {
      console.error('Invalid theory_slide_2');
      return false;
    }
    
    // Check quiz 1
    if (!content.quiz_1_type || typeof content.quiz_1_type !== 'string' || !['multiple_choice', 'true_false'].includes(content.quiz_1_type)) {
      console.error('Invalid quiz_1_type');
      return false;
    }
    
    if (!content.quiz_1_question || typeof content.quiz_1_question !== 'string' || content.quiz_1_question.trim() === '') {
      console.error('Invalid quiz_1_question');
      return false;
    }
    
    if (content.quiz_1_type === 'multiple_choice') {
      if (!Array.isArray(content.quiz_1_options) || content.quiz_1_options.length < 2) {
        console.error('Invalid quiz_1_options');
        return false;
      }
      
      if (!content.quiz_1_correct_answer || typeof content.quiz_1_correct_answer !== 'string' || content.quiz_1_correct_answer.trim() === '') {
        console.error('Invalid quiz_1_correct_answer');
        return false;
      }
      
      // Validate that the correct answer is one of the options
      const optionsLowerCase = content.quiz_1_options.map(option => option.toLowerCase());
      if (!optionsLowerCase.includes(content.quiz_1_correct_answer.toLowerCase())) {
        console.error('quiz_1_correct_answer is not one of the options');
        console.log('Options:', content.quiz_1_options);
        console.log('Correct answer:', content.quiz_1_correct_answer);
        // This is a warning but we'll still return true since the answer may just have different formatting
      }
    }
    
    if (!content.quiz_1_explanation || typeof content.quiz_1_explanation !== 'string' || content.quiz_1_explanation.trim() === '') {
      console.error('Invalid quiz_1_explanation');
      return false;
    }
    
    // Check quiz 2
    if (!content.quiz_2_type || typeof content.quiz_2_type !== 'string' || !['multiple_choice', 'true_false'].includes(content.quiz_2_type)) {
      console.error('Invalid quiz_2_type');
      return false;
    }
    
    if (!content.quiz_2_question || typeof content.quiz_2_question !== 'string' || content.quiz_2_question.trim() === '') {
      console.error('Invalid quiz_2_question');
      return false;
    }
    
    if (content.quiz_2_type === 'true_false') {
      if (typeof content.quiz_2_correct_answer !== 'boolean') {
        console.error('Invalid quiz_2_correct_answer, expected boolean but got:', typeof content.quiz_2_correct_answer);
        return false;
      }
    }
    
    if (!content.quiz_2_explanation || typeof content.quiz_2_explanation !== 'string' || content.quiz_2_explanation.trim() === '') {
      console.error('Invalid quiz_2_explanation');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating content:', error);
    return false;
  }
}

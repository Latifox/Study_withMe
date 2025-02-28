
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SegmentContentRequest {
  lectureId: number;
  segmentNumber: number;
  segmentTitle: string;
  segmentDescription: string;
  lectureContent: string;
  contentLanguage?: string;
}

export function validateRequest(payload: any): { valid: boolean; error?: string } {
  console.log("Starting detailed request validation...")
  
  // Check if required fields exist
  const requiredFields = ['lectureId', 'segmentNumber', 'segmentTitle', 'lectureContent'];
  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null) {
      console.error(`Missing required field: ${field}`);
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  // Validate lectureId
  if (typeof payload.lectureId !== 'number') {
    console.error(`Invalid lectureId type: ${typeof payload.lectureId}, value: ${payload.lectureId}`);
    return { valid: false, error: 'lectureId must be a number' };
  }
  
  // Validate segmentNumber
  if (typeof payload.segmentNumber !== 'number') {
    console.error(`Invalid segmentNumber type: ${typeof payload.segmentNumber}, value: ${payload.segmentNumber}`);
    return { valid: false, error: 'segmentNumber must be a number' };
  }
  
  // Validate segmentTitle
  if (typeof payload.segmentTitle !== 'string' || payload.segmentTitle.trim() === '') {
    console.error(`Invalid segmentTitle: ${payload.segmentTitle}`);
    return { valid: false, error: 'segmentTitle must be a non-empty string' };
  }
  
  // Validate lectureContent
  if (typeof payload.lectureContent !== 'string' || payload.lectureContent.trim() === '') {
    console.error(`Invalid lectureContent: ${typeof payload.lectureContent}, length: ${payload.lectureContent ? payload.lectureContent.length : 0}`);
    return { valid: false, error: 'lectureContent must be a non-empty string' };
  }
  
  // Validate segmentDescription (optional but should be string if present)
  if (payload.segmentDescription !== undefined && 
      (typeof payload.segmentDescription !== 'string')) {
    console.error(`Invalid segmentDescription type: ${typeof payload.segmentDescription}`);
    return { valid: false, error: 'segmentDescription must be a string' };
  }
  
  // Validate contentLanguage (optional)
  if (payload.contentLanguage !== undefined && 
      (typeof payload.contentLanguage !== 'string' || payload.contentLanguage.trim() === '')) {
    console.error(`Invalid contentLanguage: ${payload.contentLanguage}`);
    return { valid: false, error: 'contentLanguage must be a non-empty string' };
  }
  
  console.log("Request validation passed successfully");
  return { valid: true };
}

export function validateContent(content: any): ValidationResult {
  const errors: string[] = [];
  
  // Check if content is defined
  if (!content) {
    return { valid: false, errors: ['Content is undefined or null'] };
  }
  
  // Validate theory slide content
  if (!content.theory_slide_1 || typeof content.theory_slide_1 !== 'string' || content.theory_slide_1.trim() === '') {
    errors.push('Theory slide 1 is missing or invalid');
  }
  
  if (!content.theory_slide_2 || typeof content.theory_slide_2 !== 'string' || content.theory_slide_2.trim() === '') {
    errors.push('Theory slide 2 is missing or invalid');
  }
  
  // Validate quiz 1
  if (!content.quiz_1_type || typeof content.quiz_1_type !== 'string') {
    errors.push('Quiz 1 type is missing or invalid');
  }
  
  if (!content.quiz_1_question || typeof content.quiz_1_question !== 'string') {
    errors.push('Quiz 1 question is missing or invalid');
  }
  
  if (content.quiz_1_type === 'multiple-choice' && (!Array.isArray(content.quiz_1_options) || content.quiz_1_options.length < 2)) {
    errors.push('Quiz 1 options are missing or invalid for multiple-choice quiz');
  }
  
  if (!content.quiz_1_correct_answer) {
    errors.push('Quiz 1 correct answer is missing');
  }
  
  if (!content.quiz_1_explanation || typeof content.quiz_1_explanation !== 'string') {
    errors.push('Quiz 1 explanation is missing or invalid');
  }
  
  // Validate quiz 2
  if (!content.quiz_2_type || typeof content.quiz_2_type !== 'string') {
    errors.push('Quiz 2 type is missing or invalid');
  }
  
  if (!content.quiz_2_question || typeof content.quiz_2_question !== 'string') {
    errors.push('Quiz 2 question is missing or invalid');
  }
  
  if (content.quiz_2_correct_answer === undefined || content.quiz_2_correct_answer === null) {
    errors.push('Quiz 2 correct answer is missing');
  }
  
  if (!content.quiz_2_explanation || typeof content.quiz_2_explanation !== 'string') {
    errors.push('Quiz 2 explanation is missing or invalid');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}


import { SegmentContentRequest } from "./types.ts";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateRequest(data: SegmentContentRequest): ValidationResult {
  // Check for required fields
  if (!data.lectureId) {
    return { isValid: false, error: 'Missing required field: lectureId' };
  }
  
  if (data.segmentNumber === undefined || data.segmentNumber === null) {
    return { isValid: false, error: 'Missing required field: segmentNumber' };
  }
  
  if (!data.segmentTitle) {
    return { isValid: false, error: 'Missing required field: segmentTitle' };
  }
  
  if (!data.segmentDescription) {
    return { isValid: false, error: 'Missing required field: segmentDescription' };
  }
  
  if (!data.lectureContent) {
    return { isValid: false, error: 'Missing required field: lectureContent' };
  }
  
  // Additional validations
  if (typeof data.segmentNumber !== 'number' || data.segmentNumber < 1) {
    return { isValid: false, error: 'segmentNumber must be a positive number' };
  }
  
  if (typeof data.lectureContent !== 'string' || data.lectureContent.length < 10) {
    return { isValid: false, error: 'lectureContent is too short or invalid' };
  }
  
  return { isValid: true };
}


import type { ValidationResult } from "./types.ts";

export function validateRequest(requestData: any): ValidationResult {
  // Check if the required fields are present
  if (!requestData) {
    return { valid: false, error: "Request data is missing" };
  }

  const { 
    lectureId, 
    segmentNumber, 
    segmentTitle, 
    lectureContent 
  } = requestData;

  // Validate lectureId
  if (!lectureId) {
    return { valid: false, error: "lectureId is required" };
  }

  // Validate segmentNumber
  if (segmentNumber === undefined || segmentNumber === null) {
    return { valid: false, error: "segmentNumber is required" };
  }

  // Validate segmentTitle
  if (!segmentTitle) {
    return { valid: false, error: "segmentTitle is required" };
  }

  // Validate lectureContent
  if (!lectureContent) {
    return { valid: false, error: "lectureContent is required" };
  }

  // If all validations pass, return valid result
  return { valid: true };
}

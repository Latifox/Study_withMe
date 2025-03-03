
import { ValidationResult } from "./types.ts";

export function validateRequest(request: any): ValidationResult {
  // Check that all required fields are present
  if (!request) {
    return { valid: false, error: "Request body is missing" };
  }

  if (!request.lectureId) {
    return { valid: false, error: "Missing lecture ID" };
  }

  if (!request.segmentNumber && request.segmentNumber !== 0) {
    return { valid: false, error: "Missing segment number" };
  }

  if (!request.segmentTitle) {
    return { valid: false, error: "Missing segment title" };
  }

  if (!request.lectureContent) {
    return { valid: false, error: "Missing lecture content" };
  }

  // Successfully validated
  return { valid: true };
}

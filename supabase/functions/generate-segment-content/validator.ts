
import { SegmentContentRequest } from "./types.ts";

export function validateRequest(data: any): { valid: boolean; error?: string } {
  // Check if required fields are present
  if (!data.lectureId) {
    return { valid: false, error: "Missing required parameter: lectureId" };
  }

  if (!data.segmentNumber && data.segmentNumber !== 0) {
    return { valid: false, error: "Missing required parameter: segmentNumber" };
  }

  if (!data.segmentTitle) {
    return { valid: false, error: "Missing required parameter: segmentTitle" };
  }

  if (!data.lectureContent) {
    return { valid: false, error: "Missing required parameter: lectureContent" };
  }

  // Validate types
  if (typeof data.lectureId !== 'string' && typeof data.lectureId !== 'number') {
    return { valid: false, error: "Invalid type for lectureId: Must be a string or number" };
  }

  if (typeof data.segmentNumber !== 'number') {
    return { valid: false, error: "Invalid type for segmentNumber: Must be a number" };
  }

  if (typeof data.segmentTitle !== 'string') {
    return { valid: false, error: "Invalid type for segmentTitle: Must be a string" };
  }

  if (typeof data.lectureContent !== 'string') {
    return { valid: false, error: "Invalid type for lectureContent: Must be a string" };
  }

  // Additional validations
  if (data.segmentNumber < 0) {
    return { valid: false, error: "Invalid segmentNumber: Must be a non-negative number" };
  }

  if (data.segmentTitle.trim() === '') {
    return { valid: false, error: "Invalid segmentTitle: Must not be empty" };
  }

  if (data.lectureContent.trim() === '') {
    return { valid: false, error: "Invalid lectureContent: Must not be empty" };
  }

  // If we reach here, the request is valid
  return { valid: true };
}

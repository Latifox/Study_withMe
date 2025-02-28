
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

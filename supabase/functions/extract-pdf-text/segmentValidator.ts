
/**
 * Validates if the generated segments meet the required criteria
 * 
 * @param segments Array of segments to validate
 * @returns Object with validation result and potential error message
 */
export function validateSegments(segments: any[]): { valid: boolean; error?: string } {
  if (!Array.isArray(segments)) {
    return { valid: false, error: 'Segments must be an array' };
  }
  
  if (segments.length === 0) {
    return { valid: false, error: 'No segments generated' };
  }
  
  // Check if each segment has the required fields
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    if (!segment.title || typeof segment.title !== 'string') {
      return { valid: false, error: `Segment ${i+1} is missing a valid title` };
    }
    
    if (segment.title.length < 3 || segment.title.length > 100) {
      return { valid: false, error: `Segment ${i+1} title has invalid length (${segment.title.length})` };
    }
    
    if (!segment.sequence_number && segment.sequence_number !== 0) {
      return { valid: false, error: `Segment ${i+1} is missing a sequence number` };
    }
    
    if (segment.sequence_number !== i + 1) {
      return { 
        valid: false, 
        error: `Segment ${i+1} has incorrect sequence_number: ${segment.sequence_number}` 
      };
    }
  }
  
  return { valid: true };
}

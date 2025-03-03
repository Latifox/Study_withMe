
/**
 * Validates that the extracted content meets minimum requirements
 * for further processing
 */
export function validateSegments(content: string): void {
  if (!content) {
    throw new Error('Content is empty');
  }
  
  if (content.length < 100) {
    throw new Error('Content is too short for meaningful segmentation (less than 100 characters)');
  }
  
  // Check if content appears to contain actual text (not just noise)
  const wordCount = content.split(/\s+/).filter(word => word.length > 2).length;
  if (wordCount < 20) {
    throw new Error('Content contains too few words for meaningful segmentation');
  }
}

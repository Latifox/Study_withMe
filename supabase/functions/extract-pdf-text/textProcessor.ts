
/**
 * Processes and cleans text extracted from a PDF
 * 
 * @param text The raw text extracted from a PDF
 * @returns Cleaned and processed text
 */
export function processText(text: string): string {
  // Remove excessive whitespace
  let processed = text.replace(/\s+/g, ' ');
  
  // Remove common PDF artifacts
  processed = processed.replace(/(\n\s*){3,}/g, '\n\n');
  
  // Trim leading/trailing whitespace
  processed = processed.trim();
  
  return processed;
}

/**
 * Extracts basic metadata from PDF text
 * 
 * @param text The text extracted from a PDF
 * @returns An object containing basic metadata
 */
export function extractBasicMetadata(text: string): { 
  wordCount: number;
  paragraphCount: number;
  estimatedReadingTime: number;
} {
  const words = text.trim().split(/\s+/).length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  const estimatedReadingTime = Math.ceil(words / 200); // Assuming 200 words per minute reading speed
  
  return {
    wordCount: words,
    paragraphCount: paragraphs,
    estimatedReadingTime: estimatedReadingTime
  };
}

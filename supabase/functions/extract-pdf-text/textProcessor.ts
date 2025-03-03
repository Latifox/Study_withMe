
export function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/[\r\n]+/g, ' ')  // Replace newlines with space
    .trim();  // Remove leading/trailing spaces
}

export function splitIntoSegments(text: string, targetLength: number = 1000): { segments: Array<{ content: string, wordStart: number, wordEnd: number }> } {
  const words = text.split(/\s+/);
  const segments: Array<{ content: string, wordStart: number, wordEnd: number }> = [];
  
  let currentSegment: string[] = [];
  let startIndex = 1;
  
  for (let i = 0; i < words.length; i++) {
    currentSegment.push(words[i]);
    
    // Check if current segment reaches target length or ends with a period
    if (currentSegment.join(' ').length >= targetLength || 
        (words[i].endsWith('.') && currentSegment.length > 50)) {
      
      segments.push({
        content: currentSegment.join(' '),
        wordStart: startIndex,
        wordEnd: startIndex + currentSegment.length - 1
      });
      
      startIndex = startIndex + currentSegment.length;
      currentSegment = [];
    }
  }
  
  // Add remaining words as last segment if any
  if (currentSegment.length > 0) {
    segments.push({
      content: currentSegment.join(' '),
      wordStart: startIndex,
      wordEnd: startIndex + currentSegment.length - 1
    });
  }
  
  return { segments };
}

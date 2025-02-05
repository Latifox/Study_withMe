
export function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/[\r\n]+/g, ' ')  // Replace newlines with space
    .replace(/\t+/g, ' ')  // Replace tabs with space
    .trim();  // Remove leading/trailing spaces
}

export function getWordsInRange(text: string, start: number, end: number): string {
  const words = text.split(/\s+/);
  if (start < 1 || end > words.length || start > end) {
    console.error('Invalid word range:', { start, end, totalWords: words.length });
    throw new Error(`Invalid word range: start=${start}, end=${end}, total words=${words.length}`);
  }
  return words.slice(start - 1, end).join(' ');
}

export function isCompleteSentence(text: string): boolean {
  // Simplified sentence validation that focuses on basic requirements
  const trimmedText = text.trim();
  
  // Must start with a word character or number
  if (!/^[A-Za-z0-9]/.test(trimmedText)) {
    console.log('Text does not start with a valid character:', trimmedText.substring(0, 50));
    return false;
  }

  // Must end with proper punctuation
  if (!/[.!?][\s]*$/.test(trimmedText)) {
    console.log('Text does not end with proper punctuation:', trimmedText.slice(-50));
    return false;
  }

  // Basic check for minimum words (at least 3 words)
  const words = trimmedText.split(/\s+/);
  if (words.length < 3) {
    console.log('Text is too short to be a complete sentence:', trimmedText);
    return false;
  }

  return true;
}

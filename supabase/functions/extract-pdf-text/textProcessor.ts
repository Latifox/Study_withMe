
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
  // More robust sentence validation
  const trimmedText = text.trim();
  
  // Must start with a capital letter
  if (!/^[A-Z]/.test(trimmedText)) {
    console.log('Text does not start with capital letter:', trimmedText.substring(0, 50));
    return false;
  }

  // Must end with proper punctuation
  if (!/[.!?]$/.test(trimmedText)) {
    console.log('Text does not end with proper punctuation:', trimmedText.slice(-50));
    return false;
  }

  // Basic check for sentence structure (should have a subject and verb)
  const wordCount = trimmedText.split(/\s+/).length;
  if (wordCount < 3) {
    console.log('Text is too short to be a complete sentence:', trimmedText);
    return false;
  }

  // Check for balanced quotation marks and parentheses
  const quotes = (trimmedText.match(/"/g) || []).length;
  const parentheses = (trimmedText.match(/\(/g) || []).length === (trimmedText.match(/\)/g) || []).length;
  
  if (quotes % 2 !== 0 || !parentheses) {
    console.log('Unbalanced quotes or parentheses in:', trimmedText);
    return false;
  }

  return true;
}

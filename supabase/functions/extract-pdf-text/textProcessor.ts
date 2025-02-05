
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
  // Check if text starts with a capital letter and ends with proper punctuation
  return /^[A-Z].*[.!?]$/.test(text.trim());
}


/**
 * Generates a unique course code consisting of 2 letters and 4 numbers
 * Example: AB1234
 */
export const generateCourseCode = (): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const firstLetter = letters.charAt(Math.floor(Math.random() * letters.length));
  const secondLetter = letters.charAt(Math.floor(Math.random() * letters.length));
  
  // Generate 4 random digits
  const numbers = Math.floor(1000 + Math.random() * 9000).toString();
  
  return `${firstLetter}${secondLetter}${numbers}`;
};

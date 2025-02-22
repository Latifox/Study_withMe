
/**
 * Reads a file and returns its content as a string, handling any Unicode characters
 */
export const readFileContent = async (file: File): Promise<string> => {
  try {
    // Read file as array buffer to handle binary data properly
    const buffer = await file.arrayBuffer();
    // Convert to text using TextDecoder to handle Unicode properly
    const decoder = new TextDecoder('utf-8');
    const content = decoder.decode(buffer);
    // Clean the content string to remove any problematic characters
    return content.replace(/\u0000/g, ''); // Remove null bytes
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error('Failed to read file content');
  }
};

/**
 * Validates a file meets the upload requirements
 */
export const validateFile = (file: File | null): string | null => {
  if (!file) return 'Please select a file';
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Only PDF files are allowed';
  if (file.size > 10 * 1024 * 1024) return 'File size must be less than 10MB';
  return null;
};


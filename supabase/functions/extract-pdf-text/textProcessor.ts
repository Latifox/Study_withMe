
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/**
 * Extracts text from a PDF file using a simple text extraction approach
 */
export async function extractTextFromPDF(pdfFile: Blob): Promise<string> {
  try {
    console.log("Starting PDF text extraction...");
    
    // Convert the PDF file to text using pdf.js
    const pdfData = await pdfFile.arrayBuffer();
    
    // We'll use a simple approach to extract text from PDFs
    // This is a basic implementation - in a production environment you might want to use
    // a more sophisticated PDF parsing library or service
    
    // For demonstration, we'll use a simple text extraction method
    // that looks for text content in the PDF data
    const decoder = new TextDecoder("utf-8");
    const pdfText = decoder.decode(pdfData);
    
    // Extract text content from the PDF
    let extractedText = '';
    
    // Simple method: look for text chunks between markers
    // This is a simplified approach and may not work for all PDFs
    const textChunks = pdfText.match(/(\/([\w]+)\s*\d+\s*Tf[^(]*\(([^)]+)\))/g) || [];
    for (const chunk of textChunks) {
      const textMatch = chunk.match(/\(([^)]+)\)/);
      if (textMatch && textMatch[1]) {
        extractedText += ' ' + textMatch[1];
      }
    }
    
    // If our simple extraction failed, we'll use a fallback method
    if (extractedText.trim().length < 100) {
      console.log("Simple extraction yielded little text, using fallback method...");
      
      // Fallback: Extract any text between parentheses that might be content
      const allTextInParens = pdfText.match(/\(([^)]+)\)/g) || [];
      for (const text of allTextInParens) {
        // Only add text that looks like actual content (not binary data)
        if (text.length > 3 && /[a-zA-Z]{3,}/.test(text)) {
          extractedText += ' ' + text.replace(/^\(|\)$/g, '');
        }
      }
    }
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\\(\d{3}|n|r|t|f|\\|\(|\))/g, ' ') // Replace escape sequences
      .replace(/\s+/g, ' ')                       // Replace multiple spaces with a single space
      .trim();
    
    console.log(`Text extraction complete. Extracted ${extractedText.length} characters`);
    
    // If we still don't have enough text, we may need a more sophisticated method
    if (extractedText.length < 100) {
      console.warn("Warning: Extracted very little text from PDF. The document may be scanned or have content as images.");
      
      // Use a placeholder message if we couldn't extract enough text
      if (extractedText.length < 20) {
        extractedText = "The PDF appears to contain little or no extractable text. The document may be scanned or have content as images. Please provide a PDF with extractable text.";
      }
    }
    
    return extractedText;
  } catch (error) {
    console.error("Error in PDF text extraction:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

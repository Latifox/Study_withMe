
import { isCompleteSentence, getWordsInRange } from './textProcessor.ts';

export function validateSegmentBoundaries(text: string, segments: any[]): boolean {
  const words = text.split(/\s+/);
  console.log('Total words in text:', words.length);
  
  let previousEndWord = 0;
  
  for (const segment of segments) {
    console.log(`Validating segment ${segment.segment_number}:`, {
      start: segment.start_word,
      end: segment.end_word,
      title: segment.title
    });

    // Check for gaps or overlaps between segments
    if (segment.start_word !== previousEndWord + 1 && previousEndWord !== 0) {
      console.error(`Gap or overlap detected between segments at word ${segment.start_word}`);
      return false;
    }

    try {
      const segmentContent = getWordsInRange(text, segment.start_word, segment.end_word);
      console.log(`Segment ${segment.segment_number} content:`, segmentContent.substring(0, 100) + '...');

      // Enhanced validation for complete sentences
      if (!isCompleteSentence(segmentContent)) {
        console.error(`Segment ${segment.segment_number} is not a complete sentence:`, segmentContent);
        return false;
      }

      // Check for sentence-like structure with multiple sentences
      const sentences = segmentContent.match(/[^.!?]+[.!?]+/g);
      if (!sentences || sentences.length < 1) {
        console.error(`Segment ${segment.segment_number} doesn't contain proper sentences:`, segmentContent);
        return false;
      }

      // Validate first and last sentences specifically
      const firstSentence = sentences[0].trim();
      const lastSentence = sentences[sentences.length - 1].trim();

      if (!isCompleteSentence(firstSentence)) {
        console.error(`First sentence of segment ${segment.segment_number} is invalid:`, firstSentence);
        return false;
      }

      if (!isCompleteSentence(lastSentence)) {
        console.error(`Last sentence of segment ${segment.segment_number} is invalid:`, lastSentence);
        return false;
      }

      previousEndWord = segment.end_word;
    } catch (error) {
      console.error(`Error validating segment ${segment.segment_number}:`, error);
      return false;
    }
  }

  return true;
}

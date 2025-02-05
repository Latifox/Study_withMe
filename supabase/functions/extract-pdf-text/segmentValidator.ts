
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

    // Check for gaps between segments
    if (segment.start_word !== previousEndWord + 1 && previousEndWord !== 0) {
      console.error(`Gap detected between segments at word ${segment.start_word}`);
      return false;
    }

    try {
      const segmentContent = getWordsInRange(text, segment.start_word, segment.end_word);
      console.log(`Segment ${segment.segment_number} content sample:`, segmentContent.substring(0, 100));

      // Split into potential sentences
      const possibleSentences = segmentContent.match(/[^.!?]+[.!?]+/g) || [];
      
      if (possibleSentences.length === 0) {
        console.error(`No valid sentences found in segment ${segment.segment_number}`);
        return false;
      }

      // Validate first and last sentences only
      const firstSentence = possibleSentences[0].trim();
      const lastSentence = possibleSentences[possibleSentences.length - 1].trim();

      if (!isCompleteSentence(firstSentence)) {
        console.error(`First sentence invalid in segment ${segment.segment_number}:`, firstSentence);
        return false;
      }

      if (!isCompleteSentence(lastSentence)) {
        console.error(`Last sentence invalid in segment ${segment.segment_number}:`, lastSentence);
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

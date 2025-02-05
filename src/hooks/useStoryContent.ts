
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoryContent {
  segments: StorySegment[];
}

export interface StorySegment {
  id: string;
  title: string;
  slides: SegmentContent['slides'];
  questions: SegmentContent['questions'];
}

export interface SegmentContent {
  slides: {
    id: string;
    content: string;
  }[];
  questions: {
    id: string;
    type: "multiple_choice" | "true_false";
    question: string;
    options?: string[];
    correctAnswer: string | boolean;
    explanation: string;
  }[];
}

export const useStoryContent = (lectureId: string | undefined) => {
  return useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      const numericLectureId = parseInt(lectureId, 10);
      if (isNaN(numericLectureId)) throw new Error('Invalid lecture ID');

      console.log('Fetching story content for lecture:', numericLectureId);

      // Fetch segments
      const { data: segments, error: segmentsError } = await supabase
        .from('lecture_segments')
        .select('*')
        .eq('lecture_id', numericLectureId)
        .order('segment_number', { ascending: true });

      if (segmentsError) {
        console.error('Error fetching segments:', segmentsError);
        throw segmentsError;
      }

      if (!segments || segments.length === 0) {
        console.log('No segments found for lecture:', numericLectureId);
        return { segments: [] };
      }

      // For each segment, fetch its corresponding chunks
      const formattedSegments = await Promise.all(segments.map(async (segment) => {
        const { data: chunks, error: chunksError } = await supabase
          .from('lecture_polished_chunks')
          .select('chunk_order, polished_content')
          .eq('lecture_id', numericLectureId)
          .gte('chunk_order', (segment.segment_number * 2) - 1)
          .lte('chunk_order', segment.segment_number * 2)
          .order('chunk_order', { ascending: true });

        if (chunksError) {
          console.error('Error fetching chunks:', chunksError);
          throw chunksError;
        }

        if (!chunks) {
          console.log('No chunks found for segment:', segment.segment_number);
          return {
            id: segment.id.toString(),
            title: segment.title,
            slides: [],
            questions: []
          };
        }

        const slides = chunks.map((chunk, i) => ({
          id: `slide-${i + 1}`,
          content: chunk.polished_content
        }));

        // Generate placeholder questions (these will be replaced by actual questions from the edge function)
        const questions = [
          {
            id: 'q1',
            type: "multiple_choice" as const,
            question: "Question 1",
            options: ["Option 1", "Option 2", "Option 3"],
            correctAnswer: "Option 1",
            explanation: "Explanation 1"
          },
          {
            id: 'q2',
            type: "true_false" as const,
            question: "Question 2",
            correctAnswer: true,
            explanation: "Explanation 2"
          }
        ];

        return {
          id: segment.id.toString(),
          title: segment.title,
          slides,
          questions
        };
      }));

      return { segments: formattedSegments };
    },
    gcTime: 1000 * 60 * 60,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1
  });
};

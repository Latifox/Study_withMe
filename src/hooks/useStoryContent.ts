
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

      // Fetch segments and their associated chunks
      const { data: segments, error: segmentsError } = await supabase
        .from('lecture_segments')
        .select(`
          *,
          chunks:lecture_polished_chunks(chunk_order, polished_content)
        `)
        .eq('lecture_id', numericLectureId)
        .order('segment_number', { ascending: true });

      if (segmentsError) {
        console.error('Error fetching segments:', segmentsError);
        throw segmentsError;
      }

      // Transform data into the required format
      const formattedSegments = segments.map((segment, index) => {
        const chunkPair = segment.chunks as { chunk_order: number; polished_content: string }[];
        
        // Sort chunks by order and split into slides
        const sortedChunks = chunkPair.sort((a, b) => a.chunk_order - b.chunk_order);
        const slides = sortedChunks.map((chunk, i) => ({
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
      });

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

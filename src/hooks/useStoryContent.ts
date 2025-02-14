
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoryContent {
  segments: StorySegment[];
}

export interface StorySegment {
  id: string;
  title: string;
  slides: Array<{ content: string }>;
  questions: Array<{
    type: "multiple_choice" | "true_false";
    question: string;
    options?: string[];
    correctAnswer: string | boolean;
    explanation: string;
  }>;
}

export const useStoryContent = (lectureId: string | undefined) => {
  return useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      const numericLectureId = parseInt(lectureId, 10);
      if (isNaN(numericLectureId)) throw new Error('Invalid lecture ID');

      console.log('Fetching story content for lecture:', numericLectureId);

      // Fetch segments with titles
      const { data: segments, error: segmentsError } = await supabase
        .from('lecture_segments')
        .select('id, title, sequence_number')
        .eq('lecture_id', numericLectureId)
        .order('sequence_number', { ascending: true });

      if (segmentsError) {
        console.error('Error fetching segments:', segmentsError);
        throw segmentsError;
      }

      if (!segments || segments.length === 0) {
        console.log('No segments found for lecture:', numericLectureId);
        return { segments: [] };
      }

      // Fetch content for all segments
      const { data: segmentContents, error: contentsError } = await supabase
        .from('segments_content')
        .select(`
          sequence_number,
          theory_slide_1,
          theory_slide_2,
          quiz_1_type,
          quiz_1_question,
          quiz_1_options,
          quiz_1_correct_answer,
          quiz_1_explanation,
          quiz_2_type,
          quiz_2_question,
          quiz_2_correct_answer,
          quiz_2_explanation
        `)
        .eq('lecture_id', numericLectureId)
        .order('sequence_number', { ascending: true });

      if (contentsError) {
        console.error('Error fetching segment contents:', contentsError);
        throw contentsError;
      }

      console.log('Raw segment contents:', segmentContents);

      // Map segments to their content
      const formattedSegments = segments.map((segment) => {
        const content = segmentContents?.find(
          (content) => content.sequence_number === segment.sequence_number
        );

        if (content) {
          return {
            id: segment.id.toString(),
            title: segment.title,
            slides: [
              { content: content.theory_slide_1 || '' },
              { content: content.theory_slide_2 || '' }
            ],
            questions: [
              {
                type: content.quiz_1_type as "multiple_choice",
                question: content.quiz_1_question,
                options: content.quiz_1_options || [],
                correctAnswer: content.quiz_1_correct_answer,
                explanation: content.quiz_1_explanation
              },
              {
                type: content.quiz_2_type as "true_false",
                question: content.quiz_2_question,
                correctAnswer: content.quiz_2_correct_answer,
                explanation: content.quiz_2_explanation
              }
            ].filter(Boolean)
          };
        }

        // Return empty content if none exists yet
        return {
          id: segment.id.toString(),
          title: segment.title,
          slides: [
            { content: '' },
            { content: '' }
          ],
          questions: []
        };
      });

      console.log('Formatted segments:', formattedSegments);

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


import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSegmentContent = (numericLectureId: number | null, sequenceNumber: number | null) => {
  return useQuery({
    queryKey: ['segment-content', numericLectureId, sequenceNumber],
    queryFn: async () => {
      if (!numericLectureId || !sequenceNumber) throw new Error('Invalid parameters');

      console.log('Fetching content for lecture:', numericLectureId, 'sequence:', sequenceNumber);

      // Fetch segment info
      const { data: segment, error: segmentError } = await supabase
        .from('lecture_segments')
        .select('*')
        .eq('lecture_id', numericLectureId)
        .eq('sequence_number', sequenceNumber)
        .single();

      if (segmentError) {
        console.error('Error fetching segment:', segmentError);
        throw segmentError;
      }

      if (!segment) {
        console.error('No segment found');
        throw new Error('Segment not found');
      }

      // Fetch corresponding content
      const { data: segmentContent, error: contentError } = await supabase
        .from('segments_content')
        .select('theory_slide_1, theory_slide_2, quiz_1_type, quiz_1_question, quiz_1_options, quiz_1_correct_answer, quiz_1_explanation, quiz_2_type, quiz_2_question, quiz_2_correct_answer, quiz_2_explanation')
        .eq('lecture_id', numericLectureId)
        .eq('sequence_number', sequenceNumber)
        .single();

      if (contentError) {
        console.error('Error fetching content:', contentError);
        throw contentError;
      }

      return {
        segments: [{
          id: `segment_${sequenceNumber}`,
          title: segment.title,
          slides: [
            { id: 'slide-1', content: segmentContent.theory_slide_1 },
            { id: 'slide-2', content: segmentContent.theory_slide_2 }
          ],
          questions: [
            {
              type: segmentContent.quiz_1_type,
              question: segmentContent.quiz_1_question,
              options: segmentContent.quiz_1_options,
              correctAnswer: segmentContent.quiz_1_correct_answer,
              explanation: segmentContent.quiz_1_explanation
            },
            {
              type: segmentContent.quiz_2_type,
              question: segmentContent.quiz_2_question,
              correctAnswer: segmentContent.quiz_2_correct_answer,
              explanation: segmentContent.quiz_2_explanation
            }
          ].filter(Boolean)
        }]
      };
    }
  });
};

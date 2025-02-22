
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSegmentContent = (numericLectureId: number | null, sequenceNumber: number | null) => {
  return useQuery({
    queryKey: ['segment-content', numericLectureId, sequenceNumber],
    queryFn: async () => {
      if (!numericLectureId || !sequenceNumber) throw new Error('Invalid parameters');

      console.log('Fetching content for lecture:', numericLectureId, 'sequence:', sequenceNumber);

      // First check if segment exists
      const { data: segment, error: segmentError } = await supabase
        .from('lecture_segments')
        .select(`
          *,
          lectures (
            content
          )
        `)
        .eq('lecture_id', numericLectureId)
        .eq('sequence_number', sequenceNumber)
        .maybeSingle();

      if (segmentError) {
        console.error('Error fetching segment:', segmentError);
        throw segmentError;
      }

      if (!segment) {
        console.error('No segment found');
        throw new Error('Segment not found');
      }

      // Then fetch corresponding content
      const { data: segmentContent, error: contentError } = await supabase
        .from('segments_content')
        .select('*')
        .eq('lecture_id', numericLectureId)
        .eq('sequence_number', sequenceNumber)
        .maybeSingle();

      if (contentError) {
        console.error('Error fetching content:', contentError);
        throw contentError;
      }

      // If no content exists yet, trigger content generation
      if (!segmentContent) {
        console.log('No content found, triggering generation with description:', segment.segment_description);
        console.log('Full lecture content:', segment.lectures?.content);
        
        const { error: generationError } = await supabase.functions.invoke('generate-segment-content', {
          body: {
            lectureId: numericLectureId,
            segmentNumber: sequenceNumber,
            segmentTitle: segment.title,
            segmentDescription: segment.segment_description,
            lectureContent: segment.lectures?.content || ''
          }
        });

        if (generationError) {
          console.error('Error generating content:', generationError);
          throw generationError;
        }

        // Fetch the newly generated content
        const { data: newContent, error: newContentError } = await supabase
          .from('segments_content')
          .select('*')
          .eq('lecture_id', numericLectureId)
          .eq('sequence_number', sequenceNumber)
          .maybeSingle();

        if (newContentError) {
          console.error('Error fetching new content:', newContentError);
          throw newContentError;
        }

        if (!newContent) {
          console.error('Content generation failed - no content returned');
          throw new Error('Content generation failed');
        }

        return {
          segments: [{
            id: `segment_${sequenceNumber}`,
            title: segment.title,
            slides: [
              { id: 'slide-1', content: newContent.theory_slide_1 },
              { id: 'slide-2', content: newContent.theory_slide_2 }
            ],
            questions: [
              {
                type: newContent.quiz_1_type,
                question: newContent.quiz_1_question,
                options: newContent.quiz_1_options,
                correctAnswer: newContent.quiz_1_correct_answer,
                explanation: newContent.quiz_1_explanation
              },
              {
                type: newContent.quiz_2_type,
                question: newContent.quiz_2_question,
                correctAnswer: newContent.quiz_2_correct_answer,
                explanation: newContent.quiz_2_explanation
              }
            ].filter(Boolean)
          }]
        };
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
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
  });
};

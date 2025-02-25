
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Resource {
  type: 'video' | 'article' | 'research';
  title: string;
  url: string;
  description: string;
}

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

      // Fetch additional resources
      const { data: resources, error: resourcesError } = await supabase
        .from('lecture_additional_resources')
        .select('*')
        .eq('lecture_id', numericLectureId)
        .eq('segment_number', sequenceNumber);

      if (resourcesError) {
        console.error('Error fetching resources:', resourcesError);
        throw resourcesError;
      }

      // Group resources by type for easier consumption
      const groupedResources = (resources || []).reduce((acc: { [key: string]: Resource[] }, resource) => {
        const type = resource.resource_type as 'video' | 'article' | 'research';
        if (!acc[type]) acc[type] = [];
        acc[type].push({
          type,
          title: resource.title,
          url: resource.url,
          description: resource.description
        });
        return acc;
      }, {});

      // If no content exists yet, show the segment structure with loading messages
      if (!segmentContent) {
        return {
          segments: [{
            id: `segment_${sequenceNumber}`,
            title: segment.title,
            description: segment.segment_description,
            slides: [
              { id: 'slide-1', content: 'Your content is being generated using the new AI configuration...' },
              { id: 'slide-2', content: 'This usually takes about 30 seconds per segment...' }
            ],
            questions: [{
              type: 'multiple_choice',
              question: 'Please wait while your quiz questions are being generated...',
              options: ['This should only take a moment...'],
              correctAnswer: 'This should only take a moment...',
              explanation: 'Quiz content is being generated with your specified AI settings.'
            }],
            resources: groupedResources
          }]
        };
      }

      // Return full data if content exists
      return {
        segments: [{
          id: `segment_${sequenceNumber}`,
          title: segment.title,
          description: segment.segment_description,
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
          ].filter(Boolean),
          resources: groupedResources
        }]
      };
    },
    retry: 10,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });
};

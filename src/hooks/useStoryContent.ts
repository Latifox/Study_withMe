import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoryContent {
  segments: StorySegment[];
}

export interface StorySegment {
  id: string;
  title: string;
  description: string;
  slides?: SegmentContent['slides'];
  questions?: SegmentContent['questions'];
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
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      const numericLectureId = parseInt(lectureId, 10);
      if (isNaN(numericLectureId)) throw new Error('Invalid lecture ID');

      console.log('Fetching story content for lecture:', numericLectureId);

      // First, check if story content exists
      const { data: storyContent, error: contentError } = await supabase
        .from('story_contents')
        .select(`
          *,
          story_segment_contents (
            id,
            segment_number,
            segment_title,
            content
          )
        `)
        .eq('lecture_id', numericLectureId)
        .maybeSingle();

      if (contentError) {
        console.error('Error fetching story content:', contentError);
        throw contentError;
      }

      console.log('Raw story content from DB:', storyContent);

      if (!storyContent) {
        console.log('No content exists, triggering generation');
        const { data: generatedContent, error } = await supabase.functions.invoke('generate-story-content', {
          body: { lectureId: numericLectureId }
        });

        if (error) throw error;
        return generatedContent.storyContent;
      }

      // Process and validate segment content
      const sortedSegments = storyContent.story_segment_contents
        .sort((a: any, b: any) => a.segment_number - b.segment_number)
        .map((segment: any) => {
          console.log('Processing segment:', segment);
          const content = segment.content || {};
          
          // Ensure we have the required structure
          const processedSegment = {
            id: `segment-${segment.segment_number + 1}`,
            title: segment.segment_title,
            description: content.description || '',
            slides: Array.isArray(content.slides) ? content.slides : [],
            questions: Array.isArray(content.questions) ? content.questions : []
          };
          
          console.log('Processed segment:', processedSegment);
          return processedSegment;
        });

      console.log('Final processed segments:', sortedSegments);

      return {
        segments: sortedSegments
      };
    },
    gcTime: 1000 * 60 * 60,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });
};

export const useSegmentContent = (
  lectureId: string | undefined,
  segmentNumber: number,
  segmentTitle: string
) => {
  return useQuery({
    queryKey: ['segment-content', lectureId, segmentNumber],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      const numericLectureId = parseInt(lectureId, 10);
      if (isNaN(numericLectureId)) throw new Error('Invalid lecture ID');

      const { data: segment, error } = await supabase
        .from('story_segment_contents')
        .select('content')
        .eq('segment_number', segmentNumber)
        .single();

      if (error) throw error;
      if (!segment?.content) {
        throw new Error('No segment content found');
      }

      // Type assertion after validating structure
      const content = segment.content as unknown as SegmentContent;
      if (!content.slides || !content.questions) {
        throw new Error('Invalid segment content structure');
      }

      return content;
    },
    enabled: !!lectureId && segmentNumber >= 0 && !!segmentTitle,
    gcTime: 1000 * 60 * 60,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });
};
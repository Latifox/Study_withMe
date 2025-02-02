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

      const { data: storyContent, error: contentError } = await supabase
        .from('story_contents')
        .select('*, story_segment_contents(segment_number, segment_title, content)')
        .eq('lecture_id', numericLectureId)
        .maybeSingle();

      if (contentError) {
        console.error('Error fetching story content:', contentError);
        throw contentError;
      }

      if (!storyContent) {
        console.log('No content exists, triggering generation');
        const { data: generatedContent, error } = await supabase.functions.invoke('generate-story-content', {
          body: { lectureId: numericLectureId }
        });

        if (error) throw error;
        return generatedContent.storyContent;
      }

      console.log('Raw story content:', storyContent);

      // Return existing content with segment content included
      const sortedSegments = storyContent.story_segment_contents
        .sort((a: any, b: any) => a.segment_number - b.segment_number)
        .map((segment: any) => {
          console.log('Processing segment:', segment);
          return {
            id: `segment-${segment.segment_number + 1}`,
            title: segment.segment_title,
            description: segment.content?.description || '',
            slides: segment.content?.slides || [],
            questions: segment.content?.questions || []
          };
        });

      console.log('Processed segments:', sortedSegments);

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
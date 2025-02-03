import { useQuery } from "@tanstack/react-query";
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
  return useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      const numericLectureId = parseInt(lectureId, 10);
      if (isNaN(numericLectureId)) throw new Error('Invalid lecture ID');

      console.log('Fetching story content for lecture:', numericLectureId);

      // Check if content exists
      const { data: existingContent, error: contentError } = await supabase
        .from('story_contents')
        .select(`
          *,
          story_segment_contents (
            id,
            segment_number,
            title,
            content
          )
        `)
        .eq('lecture_id', numericLectureId)
        .maybeSingle();

      if (contentError) {
        console.error('Error fetching story content:', contentError);
        throw contentError;
      }

      if (!existingContent) {
        console.log('No content exists, triggering generation');
        const { data: generatedContent, error } = await supabase.functions.invoke('generate-story-content', {
          body: { lectureId: numericLectureId }
        });

        if (error) throw error;
        return generatedContent.storyContent;
      }

      // Process existing content
      const sortedSegments = existingContent.story_segment_contents
        ?.sort((a: any, b: any) => a.segment_number - b.segment_number)
        .map((segment: any) => ({
          id: `segment-${segment.segment_number + 1}`,
          title: segment.title,
          description: segment.content.description || '',
          slides: segment.content.slides || [],
          questions: segment.content.questions || []
        })) || [];

      return {
        segments: sortedSegments
      };
    },
    gcTime: 1000 * 60 * 60, // 1 hour
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1
  });
};
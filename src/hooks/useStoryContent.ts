import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

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

interface DatabaseSegmentContent {
  slides: SegmentContent['slides'];
  questions: SegmentContent['questions'];
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
          story_segments (
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
      const segments = existingContent.story_segments?.map((segment: any) => {
        const content = segment.content as unknown as DatabaseSegmentContent;
        
        return {
          id: `segment-${segment.segment_number}`,
          title: segment.title,
          description: '',
          slides: content?.slides || [],
          questions: content?.questions || []
        };
      }) || [];

      return {
        segments: segments.sort((a, b) => 
          parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1])
        )
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
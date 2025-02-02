import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoryContent {
  segments: StorySegment[];
}

export interface StorySegment {
  id: string;
  title: string;
  description: string;
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

      const { data: existingContent, error: contentError } = await supabase
        .from('story_contents')
        .select('*, story_segment_contents(*)')
        .eq('lecture_id', numericLectureId)
        .maybeSingle();

      if (contentError) throw contentError;

      if (existingContent) {
        const sortedSegments = existingContent.story_segment_contents
          .sort((a: any, b: any) => a.segment_number - b.segment_number);

        return {
          segments: sortedSegments.map((segment: any) => ({
            id: `segment-${segment.segment_number + 1}`,
            title: segment.segment_title,
            description: segment.description || ''
          }))
        };
      }

      console.log('No existing content found, generating new content...');

      const { data: generatedContent, error } = await supabase.functions.invoke('generate-story-content', {
        body: { lectureId: numericLectureId }
      });

      if (error) throw error;
      return generatedContent.storyContent;
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

      const { data: existingSegment } = await supabase
        .from('story_segment_contents')
        .select('content')
        .eq('segment_number', segmentNumber)
        .single();

      if (existingSegment?.content) {
        return existingSegment.content as SegmentContent;
      }

      const { data: lecture } = await supabase
        .from('lectures')
        .select('content')
        .eq('id', numericLectureId)
        .single();

      if (!lecture?.content) throw new Error('No lecture content found');

      const { data: generatedContent, error } = await supabase.functions.invoke('generate-segment-content', {
        body: {
          lectureId: numericLectureId,
          segmentNumber,
          segmentTitle,
          lectureContent: lecture.content
        }
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('story_segment_contents')
        .update({
          content: generatedContent.content,
          is_generated: true
        })
        .eq('segment_number', segmentNumber);

      if (updateError) throw updateError;

      return generatedContent.content as SegmentContent;
    },
    enabled: !!lectureId && segmentNumber >= 0 && !!segmentTitle,
    gcTime: 1000 * 60 * 60,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });
};
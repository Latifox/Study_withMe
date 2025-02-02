import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoryContent {
  segments: {
    id: string;
    title: string;
    slides: {
      id: string;
      content: string;
    }[];
    questions: {
      id: string;
      type: "multiple_choice" | "true_false";
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    }[];
  }[];
}

export const useStoryContent = (lectureId: string | undefined) => {
  return useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      const numericLectureId = parseInt(lectureId, 10);
      if (isNaN(numericLectureId)) throw new Error('Invalid lecture ID');

      // First, try to get existing story content
      const { data: existingContent } = await supabase
        .from('story_contents')
        .select('content')
        .eq('lecture_id', numericLectureId)
        .maybeSingle();

      if (existingContent) {
        // Type assertion after validation
        const content = existingContent.content as unknown as StoryContent;
        if (!content.segments) throw new Error('Invalid story content structure');
        return content;
      }

      console.log('No existing content found, generating new content...');

      // If no existing content, generate new content
      const { data: generatedContent, error } = await supabase.functions.invoke('generate-story-content', {
        body: { lectureId: numericLectureId }
      });

      if (error) throw error;
      if (!generatedContent?.storyContent?.segments?.length) {
        throw new Error('Invalid story content structure');
      }

      // Store the generated content
      const { error: insertError } = await supabase
        .from('story_contents')
        .insert({
          lecture_id: numericLectureId,
          content: generatedContent.storyContent
        });

      if (insertError) throw insertError;

      return generatedContent.storyContent as StoryContent;
    },
    gcTime: 1000 * 60 * 60, // Cache for 1 hour
    staleTime: Infinity, // Content won't become stale
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });
};
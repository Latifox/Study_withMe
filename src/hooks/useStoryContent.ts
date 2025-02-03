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

      // Check if story structure exists
      const { data: storyStructure, error: structureError } = await supabase
        .from('story_structures')
        .select('*')
        .eq('lecture_id', numericLectureId)
        .maybeSingle();

      if (structureError) {
        console.error('Error fetching story structure:', structureError);
        throw structureError;
      }

      if (!storyStructure) {
        console.log('No story structure exists, triggering generation');
        const { data: generatedStructure, error } = await supabase.functions.invoke('generate-story-content', {
          body: { lectureId: numericLectureId }
        });

        if (error) throw error;
        return processStoryStructure(generatedStructure.storyStructure);
      }

      return processStoryStructure(storyStructure);
    },
    gcTime: 1000 * 60 * 60, // 1 hour
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1
  });
};

const processStoryStructure = (structure: any) => {
  const segments = [];
  for (let i = 1; i <= 10; i++) {
    segments.push({
      id: `segment-${i}`,
      title: structure[`segment_${i}_title`],
      description: '',
    });
  }
  return { segments };
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

      // Get story structure id
      const { data: storyStructure } = await supabase
        .from('story_structures')
        .select('id')
        .eq('lecture_id', numericLectureId)
        .single();

      if (!storyStructure) throw new Error('Story structure not found');

      // Check if segment content exists
      const { data: existingContent } = await supabase
        .from('segment_contents')
        .select('*')
        .eq('story_structure_id', storyStructure.id)
        .eq('segment_number', segmentNumber)
        .maybeSingle();

      if (existingContent) {
        return processSegmentContent(existingContent);
      }

      // Generate new content
      const { data: generatedContent, error } = await supabase.functions.invoke('generate-segment-content', {
        body: { 
          lectureId: numericLectureId,
          segmentNumber,
          segmentTitle
        }
      });

      if (error) throw error;
      return processSegmentContent(generatedContent.segmentContent);
    },
    enabled: Boolean(lectureId && segmentNumber && segmentTitle),
    gcTime: 1000 * 60 * 60, // 1 hour
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1
  });
};

const processSegmentContent = (content: any) => {
  return {
    slides: [
      { id: 'slide-1', content: content.theory_slide_1 },
      { id: 'slide-2', content: content.theory_slide_2 }
    ],
    questions: [
      { id: 'q1', ...content.quiz_question_1 },
      { id: 'q2', ...content.quiz_question_2 }
    ]
  };
};
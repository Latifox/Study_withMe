
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StoryContent {
  segments: StorySegment[];
}

export interface StorySegment {
  id: string;
  title: string;
  slides: Array<{ content: string }>;
  questions: Array<{
    type: "multiple_choice" | "true_false";
    question: string;
    options?: string[];
    correctAnswer: string | boolean;
    explanation: string;
  }>;
}

export const useStoryContent = (lectureId: string | undefined) => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      const numericLectureId = parseInt(lectureId, 10);
      if (isNaN(numericLectureId)) throw new Error('Invalid lecture ID');

      console.log('Fetching story content for lecture:', numericLectureId);

      // First check if user is authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Authentication error');
      }

      // First check if lecture exists and get its content
      const { data: lecture, error: lectureError } = await supabase
        .from('lectures')
        .select('id, title, content')
        .eq('id', numericLectureId)
        .single();

      if (lectureError) {
        console.error('Error fetching lecture:', lectureError);
        throw new Error('Failed to fetch lecture');
      }

      if (!lecture) {
        throw new Error('Lecture not found');
      }

      // Fetch segments with titles
      let segments = await supabase
        .from('lecture_segments')
        .select('id, title, sequence_number')
        .eq('lecture_id', numericLectureId)
        .order('sequence_number', { ascending: true });

      if (segments.error) {
        console.error('Error fetching segments:', segments.error);
        throw segments.error;
      }

      if (!segments.data || segments.data.length === 0) {
        // Trigger content generation if no segments exist
        console.log('No segments found, triggering generation...');
        try {
          const { error: generationError } = await supabase.functions.invoke('generate-segments-structure', {
            body: { 
              lectureId: numericLectureId,
              lectureContent: lecture.content
            }
          });

          if (generationError) throw generationError;
          
          // Refetch segments after generation
          const newSegments = await supabase
            .from('lecture_segments')
            .select('id, title, sequence_number')
            .eq('lecture_id', numericLectureId)
            .order('sequence_number', { ascending: true });

          if (newSegments.error) throw newSegments.error;
          
          if (!newSegments.data || newSegments.data.length === 0) {
            throw new Error('Failed to generate segments');
          }

          segments = newSegments;
        } catch (error) {
          console.error('Error generating segments:', error);
          toast({
            title: "Error",
            description: "Failed to generate content. Please try again.",
            variant: "destructive"
          });
          throw error;
        }
      }

      // Fetch content for all segments
      let segmentContents = await supabase
        .from('segments_content')
        .select(`
          sequence_number,
          theory_slide_1,
          theory_slide_2,
          quiz_1_type,
          quiz_1_question,
          quiz_1_options,
          quiz_1_correct_answer,
          quiz_1_explanation,
          quiz_2_type,
          quiz_2_question,
          quiz_2_correct_answer,
          quiz_2_explanation
        `)
        .eq('lecture_id', numericLectureId)
        .order('sequence_number', { ascending: true });

      if (segmentContents.error) {
        console.error('Error fetching segment contents:', segmentContents.error);
        throw segmentContents.error;
      }

      // If no content exists, generate it
      if (!segmentContents.data || segmentContents.data.length === 0) {
        console.log('No content found, generating for each segment...');
        try {
          const contentPromises = segments.data.map(segment =>
            supabase.functions.invoke('generate-segment-content', {
              body: {
                lectureId: numericLectureId,
                segmentNumber: segment.sequence_number
              }
            })
          );

          await Promise.all(contentPromises);

          // Refetch content after generation
          const newContents = await supabase
            .from('segments_content')
            .select(`
              sequence_number,
              theory_slide_1,
              theory_slide_2,
              quiz_1_type,
              quiz_1_question,
              quiz_1_options,
              quiz_1_correct_answer,
              quiz_1_explanation,
              quiz_2_type,
              quiz_2_question,
              quiz_2_correct_answer,
              quiz_2_explanation
            `)
            .eq('lecture_id', numericLectureId)
            .order('sequence_number', { ascending: true });

          if (newContents.error) throw newContents.error;
          segmentContents = newContents;
        } catch (error) {
          console.error('Error generating content:', error);
          toast({
            title: "Error",
            description: "Failed to generate segment content. Please try again.",
            variant: "destructive"
          });
          throw error;
        }
      }

      // Map segments to their content
      const formattedSegments = segments.data.map((segment) => {
        const content = segmentContents.data?.find(
          (content) => content.sequence_number === segment.sequence_number
        );

        if (content) {
          return {
            id: segment.id.toString(),
            title: segment.title,
            slides: [
              { content: content.theory_slide_1 || '' },
              { content: content.theory_slide_2 || '' }
            ],
            questions: [
              {
                type: content.quiz_1_type as "multiple_choice",
                question: content.quiz_1_question,
                options: content.quiz_1_options || [],
                correctAnswer: content.quiz_1_correct_answer,
                explanation: content.quiz_1_explanation
              },
              {
                type: content.quiz_2_type as "true_false",
                question: content.quiz_2_question,
                correctAnswer: content.quiz_2_correct_answer,
                explanation: content.quiz_2_explanation
              }
            ].filter(Boolean)
          };
        }

        // Return empty content if none exists yet
        return {
          id: segment.id.toString(),
          title: segment.title,
          slides: [
            { content: '' },
            { content: '' }
          ],
          questions: []
        };
      });

      console.log('Formatted segments:', formattedSegments);

      return { segments: formattedSegments };
    },
    gcTime: 1000 * 60 * 60,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1
  });
};

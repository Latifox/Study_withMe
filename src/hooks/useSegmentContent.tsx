
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export const useSegmentContent = (numericLectureId: number | null) => {
  return useQuery({
    queryKey: ['segment-content', numericLectureId],
    queryFn: async () => {
      console.log('useSegmentContent: Starting fetch for lecture:', numericLectureId);

      if (!numericLectureId) {
        console.error('Missing lecture ID:', { numericLectureId });
        throw new Error('Invalid parameters');
      }

      // Get all segment titles and descriptions first
      const { data: segmentData, error: segmentError } = await supabase
        .from('lecture_segments')
        .select('sequence_number, title, segment_description')
        .eq('lecture_id', numericLectureId)
        .order('sequence_number');

      if (segmentError) {
        console.error('Error fetching segments:', segmentError);
        throw segmentError;
      }

      if (!segmentData || segmentData.length === 0) {
        console.error('No segments found for lecture');
        throw new Error('No segments found');
      }

      console.log('Retrieved segments for processing:', segmentData);

      // First get the lecture content
      const { data: lecture } = await supabase
        .from('lectures')
        .select('content')
        .eq('id', numericLectureId)
        .single();

      if (!lecture?.content) {
        throw new Error('No lecture content found');
      }

      // Get the content language from AI config if it exists
      const { data: aiConfig } = await supabase
        .from('lecture_ai_configs')
        .select('content_language')
        .eq('lecture_id', numericLectureId)
        .maybeSingle();

      const contentLanguage = aiConfig?.content_language || 'english';
      console.log('Using content language:', contentLanguage);

      // Check if content already exists for all segments
      const { data: allExistingContent } = await supabase
        .from('segments_content')
        .select('*')
        .eq('lecture_id', numericLectureId);

      if (allExistingContent && allExistingContent.length === segmentData.length) {
        console.log('Found existing content for all segments:', allExistingContent);
        return { segments: allExistingContent };
      }

      // Process one segment at a time and stop immediately if there's an error
      const results = [];
      for (const segment of segmentData) {
        // Check if content already exists for this segment
        const { data: existingContent } = await supabase
          .from('segments_content')
          .select('*')
          .eq('lecture_id', numericLectureId)
          .eq('sequence_number', segment.sequence_number)
          .single();

        if (existingContent) {
          console.log(`Content already exists for segment ${segment.sequence_number}, skipping generation`);
          results.push(existingContent);
          continue;
        }

        console.log(`Generating content for segment ${segment.sequence_number}: ${segment.title}`);
        
        try {
          // Call the edge function only once per segment - don't implement retry logic here
          // as the edge function should handle its own retries if needed
          const { data: generatedContent, error: generationError } = await supabase.functions.invoke('generate-segment-content', {
            body: {
              lectureId: numericLectureId,
              segmentNumber: segment.sequence_number,
              segmentTitle: segment.title,
              segmentDescription: segment.segment_description,
              lectureContent: lecture.content,
              contentLanguage: contentLanguage
            }
          });

          if (generationError) {
            console.error(`Error generating content for segment ${segment.sequence_number}:`, generationError);
            toast({
              title: "Error generating content",
              description: "Please try again later",
              variant: "destructive",
            });
            // Return whatever content we have so far
            return { segments: results };
          }

          if (!generatedContent?.content) {
            throw new Error('No content generated');
          }

          const contentToStore = {
            lecture_id: numericLectureId,
            sequence_number: segment.sequence_number,
            theory_slide_1: generatedContent.content.theory_slide_1,
            theory_slide_2: generatedContent.content.theory_slide_2,
            quiz_1_type: generatedContent.content.quiz_1_type,
            quiz_1_question: generatedContent.content.quiz_1_question,
            quiz_1_options: generatedContent.content.quiz_1_options,
            quiz_1_correct_answer: generatedContent.content.quiz_1_correct_answer,
            quiz_1_explanation: generatedContent.content.quiz_1_explanation,
            quiz_2_type: generatedContent.content.quiz_2_type,
            quiz_2_question: generatedContent.content.quiz_2_question,
            quiz_2_correct_answer: generatedContent.content.quiz_2_correct_answer,
            quiz_2_explanation: generatedContent.content.quiz_2_explanation
          };

          // Store the generated content
          const { data: storedContent, error: insertError } = await supabase
            .from('segments_content')
            .upsert(contentToStore)
            .select()
            .single();

          if (insertError) {
            console.error(`Error storing content for segment ${segment.sequence_number}:`, insertError);
            // Return whatever content we have so far
            return { segments: results };
          }

          // Add the newly stored content to results
          results.push(storedContent || contentToStore);

        } catch (error) {
          console.error(`Error processing segment ${segment.sequence_number}:`, error);
          toast({
            title: "Error generating content",
            description: "Please try again later",
            variant: "destructive",
          });
          // Return immediately with whatever content we have
          return { segments: results };
        }
      }

      console.log('Finished processing segments:', results);
      return { segments: results };
    },
    retry: false, // Disable retries completely
    retryOnMount: false, // Prevent retrying when component remounts
    staleTime: Infinity, // Prevent automatic refetching
    gcTime: Infinity, // Keep the data cached indefinitely
    enabled: !!numericLectureId, // Only run the query if we have a lecture ID
    refetchOnMount: false, // Prevent refetching when component remounts
    refetchOnWindowFocus: false, // Prevent refetching when window gains focus
    refetchOnReconnect: false, // Prevent refetching when network reconnects
    refetchInterval: false, // Prevent periodic refetching
  });
};

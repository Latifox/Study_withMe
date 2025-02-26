
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

      const processSegment = async (segment: { sequence_number: number; title: string; segment_description: string }, retryCount = 0) => {
        const maxRetries = 1; // Changed from 3 to 1
        const retryDelay = 2000; // Fixed delay of 2 seconds

        try {
          // Check if content already exists for this segment
          const { data: existingContent } = await supabase
            .from('segments_content')
            .select('*')
            .eq('lecture_id', numericLectureId)
            .eq('sequence_number', segment.sequence_number)
            .single();

          if (existingContent) {
            console.log(`Content already exists for segment ${segment.sequence_number}, skipping generation`);
            return existingContent;
          }

          console.log(`Generating content for segment ${segment.sequence_number}: ${segment.title}`);
          
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
            throw generationError;
          }

          if (!generatedContent?.content) {
            throw new Error('No content generated');
          }

          // Store the generated content
          const { error: insertError } = await supabase
            .from('segments_content')
            .upsert({
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
            });

          if (insertError) {
            console.error(`Error storing content for segment ${segment.sequence_number}:`, insertError);
            throw insertError;
          }

          return {
            ...generatedContent.content,
            sequence_number: segment.sequence_number,
            lecture_id: numericLectureId
          };
        } catch (error) {
          if (retryCount < maxRetries) {
            console.log(`Retrying segment ${segment.sequence_number} (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return processSegment(segment, retryCount + 1);
          }
          throw error;
        }
      };

      try {
        // Process segments sequentially
        const results = [];
        for (const segment of segmentData) {
          try {
            const content = await processSegment(segment);
            results.push(content);
          } catch (error) {
            console.error(`Failed to process segment ${segment.sequence_number}, moving to next segment:`, error);
            // Instead of throwing, we'll continue with other segments
            continue;
          }
        }

        if (results.length === 0) {
          throw new Error('Failed to generate content for any segments');
        }
        
        console.log('Finished processing segments:', results);
        return { segments: results };
      } catch (error) {
        console.error('Error processing segments:', error);
        toast({
          title: "Error generating content",
          description: "Please try again later",
          variant: "destructive",
        });
        throw error;
      }
    },
    retry: false, // Disable retries at the query level since we handle them manually
    retryOnMount: false, // Prevent retrying when component remounts
    staleTime: Infinity, // Prevent automatic refetching
    gcTime: Infinity, // Keep the data cached indefinitely
  });
};


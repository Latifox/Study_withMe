
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
      const { data: allExistingContent, error: contentError } = await supabase
        .from('segments_content')
        .select('*')
        .eq('lecture_id', numericLectureId);
      
      if (contentError) {
        console.error('Error fetching existing segments content:', contentError);
      }
        
      // If we have content for all segments, return it immediately
      if (allExistingContent && allExistingContent.length >= segmentData.length) {
        console.log('Found existing content for all segments:', allExistingContent);
        return { segments: allExistingContent };
      }

      // Create a map of existing content by sequence number for quick lookup
      const existingContentMap = new Map();
      if (allExistingContent && allExistingContent.length > 0) {
        allExistingContent.forEach(content => {
          existingContentMap.set(content.sequence_number, content);
        });
      }
      
      // Find all segments that need content generation
      const segmentsToGenerate = segmentData.filter(segment => 
        !existingContentMap.has(segment.sequence_number)
      );
      
      if (segmentsToGenerate.length === 0) {
        // This is a fallback case - we should have content for all segments at this point
        console.log('No segments need content generation, returning existing content');
        return { segments: allExistingContent || [] };
      }
      
      console.log(`Need to generate content for ${segmentsToGenerate.length} segments:`, 
        segmentsToGenerate.map(s => s.sequence_number));
      
      // Array to store all generated content
      const generatedContents = [];
      
      try {
        // Generate content for each missing segment in sequence
        for (const segmentToGenerate of segmentsToGenerate) {
          // Make sure we're passing the correct values to the edge function
          if (!segmentToGenerate.title || !segmentToGenerate.segment_description) {
            console.error(`Missing title or description for segment ${segmentToGenerate.sequence_number}`, segmentToGenerate);
            toast({
              title: "Error with segment data",
              description: `Missing title or description for segment ${segmentToGenerate.sequence_number}`,
              variant: "destructive",
            });
            continue; // Skip this segment but continue with others
          }

          console.log(`Generating content for segment ${segmentToGenerate.sequence_number}:`, {
            title: segmentToGenerate.title,
            description: segmentToGenerate.segment_description
          });

          // Call the edge function for this segment
          const { data: generatedContent, error: generationError } = await supabase.functions.invoke('generate-segment-content', {
            body: {
              lectureId: numericLectureId,
              segmentNumber: segmentToGenerate.sequence_number,
              segmentTitle: segmentToGenerate.title,
              segmentDescription: segmentToGenerate.segment_description,
              lectureContent: lecture.content,
              contentLanguage: contentLanguage
            }
          });

          if (generationError) {
            console.error(`Error generating content for segment ${segmentToGenerate.sequence_number}:`, generationError);
            toast({
              title: "Error generating content",
              description: `Failed for segment ${segmentToGenerate.sequence_number}. Continuing with others.`,
              variant: "destructive",
            });
            continue; // Skip this segment but continue with others
          }

          if (!generatedContent?.content) {
            console.error(`No content generated for segment ${segmentToGenerate.sequence_number}`);
            continue; // Skip this segment but continue with others
          }

          console.log(`Successfully generated content for segment ${segmentToGenerate.sequence_number}:`, generatedContent);

          // Prepare content for storage with proper type handling
          const contentToStore = {
            lecture_id: numericLectureId,
            sequence_number: segmentToGenerate.sequence_number,
            theory_slide_1: generatedContent.content.theory_slide_1 || '',
            theory_slide_2: generatedContent.content.theory_slide_2 || '',
            quiz_1_type: generatedContent.content.quiz_1_type || 'multiple_choice',
            quiz_1_question: generatedContent.content.quiz_1_question || '',
            quiz_1_options: Array.isArray(generatedContent.content.quiz_1_options) 
              ? generatedContent.content.quiz_1_options 
              : [],
            quiz_1_correct_answer: generatedContent.content.quiz_1_correct_answer || '',
            quiz_1_explanation: generatedContent.content.quiz_1_explanation || '',
            quiz_2_type: generatedContent.content.quiz_2_type || 'true_false',
            quiz_2_question: generatedContent.content.quiz_2_question || '',
            quiz_2_correct_answer: generatedContent.content.quiz_2_correct_answer === true || 
              generatedContent.content.quiz_2_correct_answer === 'true',
            quiz_2_explanation: generatedContent.content.quiz_2_explanation || ''
          };

          // More robust storage approach: First check if entry exists
          const { data: existingEntry } = await supabase
            .from('segments_content')
            .select('id')
            .eq('lecture_id', numericLectureId)
            .eq('sequence_number', segmentToGenerate.sequence_number)
            .maybeSingle();
          
          let storageResult;
          
          if (existingEntry) {
            // If entry exists, update it
            console.log(`Entry exists for segment ${segmentToGenerate.sequence_number}, updating...`);
            storageResult = await supabase
              .from('segments_content')
              .update(contentToStore)
              .eq('id', existingEntry.id)
              .select();
          } else {
            // If no entry exists, insert new one
            console.log(`No entry exists for segment ${segmentToGenerate.sequence_number}, inserting...`);
            storageResult = await supabase
              .from('segments_content')
              .insert(contentToStore)
              .select();
          }
          
          // Check result of storage operation
          if (storageResult.error) {
            console.error(`Error storing content for segment ${segmentToGenerate.sequence_number}:`, storageResult.error);
            
            // Try a direct upsert as last resort
            const { data: upsertContent, error: upsertError } = await supabase
              .from('segments_content')
              .upsert(contentToStore)
              .select();
              
            if (upsertError) {
              console.error(`Final upsert also failed for segment ${segmentToGenerate.sequence_number}:`, upsertError);
              continue; // Continue with other segments
            } else if (upsertContent && upsertContent.length > 0) {
              console.log(`Successfully upserted content for segment ${segmentToGenerate.sequence_number} after prior failures`);
              generatedContents.push(upsertContent[0]);
              existingContentMap.set(segmentToGenerate.sequence_number, upsertContent[0]);
            }
          } else if (storageResult.data && storageResult.data.length > 0) {
            console.log(`Successfully stored content for segment ${segmentToGenerate.sequence_number} using primary method`);
            generatedContents.push(storageResult.data[0]);
            existingContentMap.set(segmentToGenerate.sequence_number, storageResult.data[0]);
          }
        }
        
        // Get updated content again to ensure we have all segments
        const { data: updatedContent, error: fetchError } = await supabase
          .from('segments_content')
          .select('*')
          .eq('lecture_id', numericLectureId)
          .order('sequence_number');
          
        if (fetchError) {
          console.error('Error fetching updated content:', fetchError);
        } else {
          console.log('All content after generation:', updatedContent);
          console.log(`Expected ${segmentData.length} segments, found ${updatedContent?.length || 0} in segments_content`);
        }
        
        if (generatedContents.length > 0) {
          toast({
            title: "Content generation complete",
            description: `Generated content for ${generatedContents.length} segments`,
          });
        }

        // Use the updatedContent if available, otherwise fallback to our tracked content
        let finalContent;
        if (updatedContent && updatedContent.length > 0) {
          finalContent = updatedContent;
        } else {
          // Combine newly generated content with existing content
          finalContent = Array.from(existingContentMap.values());
          
          // If we still have no content, use whatever we generated
          if (finalContent.length === 0) {
            finalContent = generatedContents;
          }
        }
        
        console.log('Final content being returned:', finalContent);
        return { segments: finalContent };

      } catch (error) {
        console.error('Error processing segments:', error);
        toast({
          title: "Error generating content",
          description: "Please try again later",
          variant: "destructive",
        });
        // Return whatever content we have
        const fallbackContent = Array.from(existingContentMap.values());
        if (fallbackContent.length === 0 && generatedContents.length > 0) {
          console.log('Returning generated content after error:', generatedContents);
          return { segments: generatedContents };
        }
        console.log('Returning fallback content after error:', fallbackContent);
        return { segments: fallbackContent };
      }
    },
    retry: 1, // Allow one retry only
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

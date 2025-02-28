
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
      const { data: existingContent, error: contentError } = await supabase
        .from('segments_content')
        .select('*')
        .eq('lecture_id', numericLectureId);
      
      if (contentError) {
        console.error('Error fetching existing segments content:', contentError);
        throw contentError;
      }
      
      // Create a map of existing content by sequence number for quick lookup
      const existingContentMap = new Map();
      if (existingContent && existingContent.length > 0) {
        existingContent.forEach(content => {
          existingContentMap.set(content.sequence_number, content);
        });
      }
      
      console.log(`Found ${existingContent?.length || 0} existing segments with content`);
      console.log(`Total segments needed: ${segmentData.length}`);
      
      // If we have content for all segments, return it immediately
      if (existingContent && existingContent.length >= segmentData.length) {
        console.log('Found existing content for all segments, returning immediately');
        return { segments: existingContent };
      }
      
      // Find all segments that need content generation
      const segmentsToGenerate = segmentData.filter(segment => 
        !existingContentMap.has(segment.sequence_number)
      );
      
      if (segmentsToGenerate.length === 0) {
        // This is a fallback case - we should have content for all segments at this point
        console.log('No segments need content generation, returning existing content');
        return { segments: existingContent || [] };
      }
      
      console.log(`Need to generate content for ${segmentsToGenerate.length} segments:`, 
        segmentsToGenerate.map(s => s.sequence_number));
      
      // Array to store all generated content
      const generatedContents = [];
      
      try {
        // Generate content for each missing segment one by one
        for (const segment of segmentsToGenerate) {
          // Make sure we're passing the correct values to the edge function
          if (!segment.title || !segment.segment_description) {
            console.error(`Missing title or description for segment ${segment.sequence_number}`, segment);
            toast({
              title: "Error with segment data",
              description: `Missing title or description for segment ${segment.sequence_number}`,
              variant: "destructive",
            });
            continue; // Skip this segment but continue with others
          }

          console.log(`Generating content for segment ${segment.sequence_number}:`, {
            title: segment.title,
            description: segment.segment_description
          });

          // Call the edge function for this segment
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
              description: `Failed for segment ${segment.sequence_number}. Continuing with others.`,
              variant: "destructive",
            });
            continue; // Skip this segment but continue with others
          }

          if (!generatedContent?.content) {
            console.error(`No content generated for segment ${segment.sequence_number}`);
            continue; // Skip this segment but continue with others
          }

          console.log(`Successfully generated content for segment ${segment.sequence_number}:`, generatedContent);

          // Prepare content for storage with proper type handling
          const contentToStore = {
            lecture_id: numericLectureId,
            sequence_number: segment.sequence_number,
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

          // Try direct insert first - most reliable approach
          const { data: insertedContent, error: insertError } = await supabase
            .from('segments_content')
            .insert(contentToStore)
            .select();
          
          if (insertError) {
            console.error(`Insert error for segment ${segment.sequence_number}:`, insertError);
            
            // Check if this is a duplicate - if so, try update instead
            if (insertError.code === '23505') { // Unique violation
              console.log(`Duplicate detected for segment ${segment.sequence_number}, trying update`);
              
              const { data: updatedContent, error: updateError } = await supabase
                .from('segments_content')
                .update(contentToStore)
                .eq('lecture_id', numericLectureId)
                .eq('sequence_number', segment.sequence_number)
                .select();
              
              if (updateError) {
                console.error(`Update error for segment ${segment.sequence_number}:`, updateError);
                
                // Last resort - try upsert
                const { data: upsertContent, error: upsertError } = await supabase
                  .from('segments_content')
                  .upsert(contentToStore)
                  .select();
                
                if (upsertError) {
                  console.error(`Final upsert also failed for segment ${segment.sequence_number}:`, upsertError);
                  continue; // Continue with other segments
                } else if (upsertContent && upsertContent.length > 0) {
                  console.log(`Successfully upserted content for segment ${segment.sequence_number}`);
                  generatedContents.push(upsertContent[0]);
                  existingContentMap.set(segment.sequence_number, upsertContent[0]);
                }
              } else if (updatedContent && updatedContent.length > 0) {
                console.log(`Successfully updated content for segment ${segment.sequence_number}`);
                generatedContents.push(updatedContent[0]);
                existingContentMap.set(segment.sequence_number, updatedContent[0]);
              }
            } else {
              // For non-duplicate errors, try the upsert approach
              console.log(`Non-duplicate error, trying upsert for segment ${segment.sequence_number}`);
              
              const { data: upsertContent, error: upsertError } = await supabase
                .from('segments_content')
                .upsert(contentToStore)
                .select();
              
              if (upsertError) {
                console.error(`Upsert error for segment ${segment.sequence_number}:`, upsertError);
                continue; // Continue with other segments
              } else if (upsertContent && upsertContent.length > 0) {
                console.log(`Successfully upserted content for segment ${segment.sequence_number}`);
                generatedContents.push(upsertContent[0]);
                existingContentMap.set(segment.sequence_number, upsertContent[0]);
              }
            }
          } else if (insertedContent && insertedContent.length > 0) {
            console.log(`Successfully inserted content for segment ${segment.sequence_number}`);
            generatedContents.push(insertedContent[0]);
            existingContentMap.set(segment.sequence_number, insertedContent[0]);
          }
          
          // Add a short delay between segments to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Get all content again to ensure we have all segments
        const { data: allContent, error: fetchError } = await supabase
          .from('segments_content')
          .select('*')
          .eq('lecture_id', numericLectureId)
          .order('sequence_number');
          
        if (fetchError) {
          console.error('Error fetching updated content:', fetchError);
        } else {
          console.log('All content after generation:', allContent);
          console.log(`Expected ${segmentData.length} segments, found ${allContent?.length || 0} in segments_content`);
        }
        
        if (generatedContents.length > 0) {
          toast({
            title: "Content generation complete",
            description: `Generated content for ${generatedContents.length} segments`,
          });
        }

        // Return all content from the database - the most reliable source
        if (allContent && allContent.length > 0) {
          return { segments: allContent };
        }
        
        // Fallback: combine existing and newly generated content
        const allSegmentsContent = Array.from(existingContentMap.values());
        if (allSegmentsContent.length === 0) {
          allSegmentsContent.push(...generatedContents);
        }
        
        console.log('Final content being returned:', allSegmentsContent);
        return { segments: allSegmentsContent };

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

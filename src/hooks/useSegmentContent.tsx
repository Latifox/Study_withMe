
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

      // First get all segments to understand what we need to generate
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

      console.log(`Found ${segmentData.length} segments for lecture ${numericLectureId}`);

      // Get the lecture content
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

      // Check if content already exists for segments
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
        console.log(`Found ${existingContent.length} existing content entries`);
        existingContent.forEach(content => {
          existingContentMap.set(content.sequence_number, content);
        });
      } else {
        console.log('No existing content found, will generate for all segments');
      }
      
      // If we have content for all segments, return it immediately
      if (existingContent && existingContent.length >= segmentData.length) {
        console.log('Found existing content for all segments, returning immediately');
        return { segments: existingContent };
      }
      
      // Find all segments that need content generation
      const segmentsToGenerate = segmentData.filter(segment => 
        !existingContentMap.has(segment.sequence_number)
      );
      
      console.log(`Need to generate content for ${segmentsToGenerate.length} segments:`, 
        segmentsToGenerate.map(s => s.sequence_number));
      
      // Array to store all generated content
      const allContent = existingContent ? [...existingContent] : [];
      
      try {
        // Process each segment sequentially
        for (const segment of segmentsToGenerate) {
          console.log(`Processing segment ${segment.sequence_number}: ${segment.title}`);
          
          // Skip if we already have content for this segment (double-check)
          if (existingContentMap.has(segment.sequence_number)) {
            console.log(`Already have content for segment ${segment.sequence_number}, skipping`);
            continue;
          }
          
          if (!segment.title || !segment.segment_description) {
            console.error(`Missing title or description for segment ${segment.sequence_number}`, segment);
            toast({
              title: "Error with segment data",
              description: `Missing title or description for segment ${segment.sequence_number}`,
              variant: "destructive",
            });
            continue;
          }

          // Generate content for this segment
          console.log(`Generating content for segment ${segment.sequence_number}`);
          
          // Call the edge function to generate content
          const { data: generatedContent, error: generationError } = await supabase.functions.invoke(
            'generate-segment-content', 
            {
              body: {
                lectureId: numericLectureId,
                segmentNumber: segment.sequence_number,
                segmentTitle: segment.title,
                segmentDescription: segment.segment_description,
                lectureContent: lecture.content,
                contentLanguage: contentLanguage
              }
            }
          );

          if (generationError) {
            console.error(`Error generating content for segment ${segment.sequence_number}:`, generationError);
            toast({
              title: "Error generating content",
              description: `Failed for segment ${segment.sequence_number}. Will try again later.`,
              variant: "destructive",
            });
            continue;
          }

          if (!generatedContent?.content) {
            console.error(`No content generated for segment ${segment.sequence_number}`);
            continue;
          }

          console.log(`Successfully generated content for segment ${segment.sequence_number}`);

          // Prepare content for storage
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

          let storageSuccessful = false;
          let storedContent = null;

          // Try all three methods of storage in sequence
          
          // 1. Try direct insert first
          console.log(`Attempting INSERT for segment ${segment.sequence_number}`);
          const { data: insertedContent, error: insertError } = await supabase
            .from('segments_content')
            .insert(contentToStore)
            .select();
          
          if (!insertError && insertedContent && insertedContent.length > 0) {
            console.log(`Successfully inserted content for segment ${segment.sequence_number}`);
            storedContent = insertedContent[0];
            storageSuccessful = true;
          } else if (insertError) {
            console.error(`Insert error for segment ${segment.sequence_number}:`, insertError);
            
            // 2. Try upsert if insert fails
            console.log(`Attempting UPSERT for segment ${segment.sequence_number}`);
            const { data: upsertContent, error: upsertError } = await supabase
              .from('segments_content')
              .upsert(contentToStore)
              .select();
            
            if (!upsertError && upsertContent && upsertContent.length > 0) {
              console.log(`Successfully upserted content for segment ${segment.sequence_number}`);
              storedContent = upsertContent[0];
              storageSuccessful = true;
            } else if (upsertError) {
              console.error(`Upsert error for segment ${segment.sequence_number}:`, upsertError);
              
              // 3. Try update as last resort
              console.log(`Attempting UPDATE for segment ${segment.sequence_number}`);
              const { data: updatedContent, error: updateError } = await supabase
                .from('segments_content')
                .update(contentToStore)
                .eq('lecture_id', numericLectureId)
                .eq('sequence_number', segment.sequence_number)
                .select();
              
              if (!updateError && updatedContent && updatedContent.length > 0) {
                console.log(`Successfully updated content for segment ${segment.sequence_number}`);
                storedContent = updatedContent[0];
                storageSuccessful = true;
              } else if (updateError) {
                console.error(`Update error for segment ${segment.sequence_number}:`, updateError);
              }
            }
          }
          
          if (storageSuccessful && storedContent) {
            allContent.push(storedContent);
            existingContentMap.set(segment.sequence_number, storedContent);
            
            console.log(`Content for segment ${segment.sequence_number} successfully stored`);
          } else {
            console.error(`Failed to store content for segment ${segment.sequence_number} after all attempts`);
            toast({
              title: "Storage error",
              description: `Could not save content for segment ${segment.sequence_number}`,
              variant: "destructive",
            });
          }
          
          // Add a short delay between segments to prevent race conditions
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // Final check to make sure we have all segments
        if (allContent.length < segmentData.length) {
          console.log(`WARNING: Only generated ${allContent.length} segments out of ${segmentData.length}`);
          
          // Fetch all content one last time to ensure we have the latest data
          const { data: finalContent, error: finalError } = await supabase
            .from('segments_content')
            .select('*')
            .eq('lecture_id', numericLectureId)
            .order('sequence_number');
            
          if (!finalError && finalContent && finalContent.length > 0) {
            console.log(`Final fetch returned ${finalContent.length} segments`);
            return { segments: finalContent };
          }
        }
        
        // Sort segments by sequence number before returning
        allContent.sort((a, b) => a.sequence_number - b.sequence_number);
        
        console.log(`Returning ${allContent.length} segments of content`);
        return { segments: allContent };

      } catch (error) {
        console.error('Error processing segments:', error);
        toast({
          title: "Error generating content",
          description: "An unexpected error occurred. Please try again later.",
          variant: "destructive",
        });
        
        // Return whatever content we have so far
        if (allContent.length > 0) {
          return { segments: allContent };
        }
        
        throw error;
      }
    },
    retry: 1,
    staleTime: Infinity, 
    gcTime: Infinity,
    enabled: !!numericLectureId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, 
    refetchInterval: false,
  });
};

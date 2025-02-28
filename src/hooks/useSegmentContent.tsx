
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

      // Step 1: Get all segments to understand what we need to generate
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

      // Step 2: Get the lecture content needed for generation
      const { data: lecture, error: lectureError } = await supabase
        .from('lectures')
        .select('content')
        .eq('id', numericLectureId)
        .single();
      
      if (lectureError) {
        console.error('Error fetching lecture content:', lectureError);
        throw lectureError;
      }

      if (!lecture?.content) {
        console.error('No lecture content found');
        throw new Error('No lecture content found');
      }

      // Step 3: Get the content language preference if it exists
      const { data: aiConfig } = await supabase
        .from('lecture_ai_configs')
        .select('content_language')
        .eq('lecture_id', numericLectureId)
        .maybeSingle();

      const contentLanguage = aiConfig?.content_language || 'english';
      console.log('Using content language:', contentLanguage);

      // Step 4: Check what content already exists in the database
      const { data: existingContent, error: contentError } = await supabase
        .from('segments_content')
        .select('*')
        .eq('lecture_id', numericLectureId);
      
      if (contentError) {
        console.error('Error fetching existing segments content:', contentError);
        throw contentError;
      }
      
      // Create an easy lookup map of existing content by sequence number
      const existingContentMap = new Map();
      if (existingContent && existingContent.length > 0) {
        console.log(`Found ${existingContent.length} existing content entries`);
        existingContent.forEach(content => {
          existingContentMap.set(content.sequence_number, content);
        });
      } else {
        console.log('No existing content found, will generate for all segments');
      }
      
      // Step 5: Return early if all segments already have content
      if (existingContent && existingContent.length >= segmentData.length) {
        console.log('All segments already have content, no generation needed');
        const sortedContent = [...existingContent].sort((a, b) => a.sequence_number - b.sequence_number);
        return { segments: sortedContent };
      }
      
      // Step 6: Process segments that need content generation
      console.log('Starting content generation for segments without content');
      const allContent = [...(existingContent || [])];
      
      // Process each segment one by one
      for (const segment of segmentData) {
        // Skip segments that already have content
        if (existingContentMap.has(segment.sequence_number)) {
          console.log(`Segment ${segment.sequence_number} already has content, skipping generation`);
          continue;
        }
        
        console.log(`Generating content for segment ${segment.sequence_number}: ${segment.title}`);
        
        if (!segment.title || !segment.segment_description) {
          console.error(`Missing title or description for segment ${segment.sequence_number}`);
          continue;
        }
        
        try {
          // Generate content using the edge function
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

          // Prepare the content for storage
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

          console.log(`Storing content for segment ${segment.sequence_number}`);
          
          // Try to insert the content directly
          const { data: insertedContent, error: insertError } = await supabase
            .from('segments_content')
            .insert(contentToStore)
            .select()
            .single();
          
          if (insertError) {
            console.error(`Failed to insert content for segment ${segment.sequence_number}:`, insertError);
            
            // If insert fails, try to update in case it exists but wasn't found earlier
            const { data: updatedContent, error: updateError } = await supabase
              .from('segments_content')
              .update(contentToStore)
              .eq('lecture_id', numericLectureId)
              .eq('sequence_number', segment.sequence_number)
              .select()
              .single();
            
            if (updateError) {
              console.error(`Failed to update content for segment ${segment.sequence_number}:`, updateError);
              toast({
                title: "Storage error",
                description: `Could not save content for segment ${segment.sequence_number}`,
                variant: "destructive",
              });
              continue;
            }
            
            allContent.push(updatedContent);
            console.log(`Updated content for segment ${segment.sequence_number}`);
          } else {
            allContent.push(insertedContent);
            console.log(`Inserted content for segment ${segment.sequence_number}`);
          }
          
          // Add a delay between segments to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error processing segment ${segment.sequence_number}:`, error);
          toast({
            title: "Error",
            description: `Failed to process segment ${segment.sequence_number}`,
            variant: "destructive",
          });
        }
      }
      
      // Step 7: Final verification to ensure we have all content
      if (allContent.length < segmentData.length) {
        console.log(`Only generated ${allContent.length} out of ${segmentData.length} segments`);
        
        // One final fetch to get the latest content
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
      
      // Sort the content by sequence number
      allContent.sort((a, b) => a.sequence_number - b.sequence_number);
      console.log(`Returning ${allContent.length} segments of content`);
      return { segments: allContent };
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

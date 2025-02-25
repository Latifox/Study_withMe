
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Resource {
  type: 'video' | 'article' | 'research';
  title: string;
  url: string;
  description: string;
}

export const useSegmentContent = (numericLectureId: number | null, sequenceNumber: number | null) => {
  return useQuery({
    queryKey: ['segment-content', numericLectureId, sequenceNumber],
    queryFn: async () => {
      console.log('useSegmentContent: Starting fetch with params:', { numericLectureId, sequenceNumber });

      if (!numericLectureId || !sequenceNumber) {
        console.error('Missing or invalid parameters:', { numericLectureId, sequenceNumber });
        throw new Error('Invalid parameters');
      }

      // First check if segment exists
      const { data: segment, error: segmentError } = await supabase
        .from('lecture_segments')
        .select(`
          *,
          lectures (
            content
          )
        `)
        .eq('lecture_id', numericLectureId)
        .eq('sequence_number', sequenceNumber)
        .maybeSingle();

      if (segmentError) {
        console.error('Error fetching segment:', segmentError);
        throw segmentError;
      }

      if (!segment) {
        console.error('No segment found for:', { numericLectureId, sequenceNumber });
        throw new Error('Segment not found');
      }

      console.log('Found segment:', segment);

      // Then fetch corresponding content
      const { data: segmentContent, error: contentError } = await supabase
        .from('segments_content')
        .select('*')
        .eq('lecture_id', numericLectureId)
        .eq('sequence_number', sequenceNumber)
        .maybeSingle();

      if (contentError) {
        console.error('Error fetching content:', contentError);
        throw contentError;
      }

      // Fetch additional resources
      const { data: initialResources, error: resourcesError } = await supabase
        .from('lecture_additional_resources')
        .select('*')
        .eq('lecture_id', numericLectureId)
        .eq('segment_number', sequenceNumber);

      console.log('Initial resources fetch result:', { initialResources, resourcesError });

      let resourcesData = initialResources;

      // If no resources exist AND there was no error, generate them
      if (!resourcesError && (!initialResources || initialResources.length === 0)) {
        console.log('No resources found, generating new ones...');
        try {
          const { data: generatedData, error: generationError } = await supabase.functions.invoke('generate-resources', {
            body: {
              lectureContent: segment.lectures.content,
              segmentTitles: [segment.title],
              aiConfig: { content_language: 'english' }
            }
          });

          console.log('Generate resources response:', { generatedData, generationError });

          if (generationError) {
            console.error('Error generating resources:', generationError);
            throw generationError;
          }

          if (generatedData && generatedData[0]?.resources) {
            // Store the generated resources in the database
            const { error: insertError } = await supabase
              .from('lecture_additional_resources')
              .insert(
                generatedData[0].resources.map((resource: Resource) => ({
                  lecture_id: numericLectureId,
                  segment_number: sequenceNumber,
                  resource_type: resource.type,
                  title: resource.title,
                  url: resource.url,
                  description: resource.description
                }))
              );

            if (insertError) {
              console.error('Error storing generated resources:', insertError);
              throw insertError;
            }

            resourcesData = generatedData[0].resources;
            console.log('Successfully generated and stored resources:', resourcesData);
          }
        } catch (error) {
          console.error('Error in generate-resources function:', error);
          throw error; // Throw the error to trigger a retry
        }
      } else if (resourcesError) {
        console.error('Error fetching resources:', resourcesError);
        throw resourcesError;
      }

      // Group resources by type for easier consumption
      const groupedResources = (resourcesData || []).reduce((acc: { [key: string]: Resource[] }, resource) => {
        const type = resource.resource_type as 'video' | 'article' | 'research';
        if (!acc[type]) acc[type] = [];
        acc[type].push({
          type,
          title: resource.title,
          url: resource.url,
          description: resource.description
        });
        return acc;
      }, {});

      // If no content exists yet, show the segment structure with loading messages
      if (!segmentContent) {
        return {
          segments: [{
            id: `segment_${sequenceNumber}`,
            title: segment.title,
            description: segment.segment_description,
            slides: [
              { id: 'slide-1', content: 'Your content is being generated using the new AI configuration...' },
              { id: 'slide-2', content: 'This usually takes about 30 seconds per segment...' }
            ],
            questions: [{
              type: 'multiple_choice',
              question: 'Please wait while your quiz questions are being generated...',
              options: ['This should only take a moment...'],
              correctAnswer: 'This should only take a moment...',
              explanation: 'Quiz content is being generated with your specified AI settings.'
            }],
            resources: groupedResources
          }]
        };
      }

      // Return full data if content exists
      return {
        segments: [{
          id: `segment_${sequenceNumber}`,
          title: segment.title,
          description: segment.segment_description,
          slides: [
            { id: 'slide-1', content: segmentContent.theory_slide_1 },
            { id: 'slide-2', content: segmentContent.theory_slide_2 }
          ],
          questions: [
            {
              type: segmentContent.quiz_1_type,
              question: segmentContent.quiz_1_question,
              options: segmentContent.quiz_1_options,
              correctAnswer: segmentContent.quiz_1_correct_answer,
              explanation: segmentContent.quiz_1_explanation
            },
            {
              type: segmentContent.quiz_2_type,
              question: segmentContent.quiz_2_question,
              correctAnswer: segmentContent.quiz_2_correct_answer,
              explanation: segmentContent.quiz_2_explanation
            }
          ].filter(Boolean),
          resources: groupedResources
        }]
      };
    },
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });
};


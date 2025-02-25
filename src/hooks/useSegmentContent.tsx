
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

      // First get the lecture content and segment titles to guide the LLM
      const { data: lecture, error: lectureError } = await supabase
        .from('lectures')
        .select('content')
        .eq('id', numericLectureId)
        .single();

      if (lectureError) {
        console.error('Error fetching lecture:', lectureError);
        throw lectureError;
      }

      const { data: segments, error: segmentsError } = await supabase
        .from('lecture_segments')
        .select('title')
        .eq('lecture_id', numericLectureId)
        .order('sequence_number', { ascending: true });

      if (segmentsError) {
        console.error('Error fetching segments:', segmentsError);
        throw segmentsError;
      }

      // Fetch existing resources
      const { data: resources, error: resourcesError } = await supabase
        .from('lecture_additional_resources')
        .select('*')
        .eq('lecture_id', numericLectureId);

      if (resourcesError) {
        console.error('Error fetching resources:', resourcesError);
        throw resourcesError;
      }

      // If no resources exist, generate them
      if (!resources || resources.length === 0) {
        console.log('No resources found, generating new ones...');
        try {
          const { data: generatedData, error: generationError } = await supabase.functions.invoke('generate-resources', {
            body: {
              lectureContent: lecture.content,
              segmentTitles: segments.map(s => s.title),
              aiConfig: { content_language: 'english' }
            }
          });

          console.log('Generate resources response:', { generatedData, generationError });

          if (generationError) {
            console.error('Error generating resources:', generationError);
            throw generationError;
          }

          if (generatedData && generatedData[0]?.resources) {
            // Store the generated resources
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

            resources.push(...generatedData[0].resources);
            console.log('Successfully generated and stored resources:', resources);
          }
        } catch (error) {
          console.error('Error in generate-resources function:', error);
          throw error;
        }
      }

      // Group resources by type
      const groupedResources = (resources || []).reduce((acc: { [key: string]: Resource[] }, resource) => {
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

      return {
        segments: [{
          id: `segment_${sequenceNumber}`,
          title: segments[0]?.title || 'Lecture Resources',
          description: 'Additional learning resources for this lecture',
          resources: groupedResources
        }]
      };
    },
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });
};

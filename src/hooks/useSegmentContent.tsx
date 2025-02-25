
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

      // First check if resources already exist
      const { data: existingResources, error: resourcesError } = await supabase
        .from('lecture_additional_resources')
        .select('*')
        .eq('lecture_id', numericLectureId)
        .eq('segment_number', sequenceNumber);

      if (resourcesError) {
        console.error('Error fetching existing resources:', resourcesError);
        throw resourcesError;
      }

      // If resources exist, return them grouped by type
      if (existingResources && existingResources.length > 0) {
        console.log('Found existing resources:', existingResources);
        const groupedResources = existingResources.reduce((acc: { [key: string]: Resource[] }, resource) => {
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
            title: 'Additional Learning Resources',
            description: 'Curated resources to enhance your understanding',
            resources: groupedResources
          }]
        };
      }

      // If no resources exist, we need to generate them
      console.log('No existing resources found, fetching lecture content and segment titles...');

      // Get the lecture title to use for generation
      const { data: lecture, error: lectureError } = await supabase
        .from('lectures')
        .select('title')
        .eq('id', numericLectureId)
        .single();

      if (lectureError) {
        console.error('Error fetching lecture:', lectureError);
        throw lectureError;
      }

      console.log('Generating resources with lecture title:', lecture.title);

      // Generate resources using the edge function
      try {
        const { data: generatedData, error: generationError } = await supabase.functions.invoke('generate-resources', {
          body: {
            topic: lecture.title,
            language: 'spanish'
          }
        });

        if (generationError) {
          console.error('Error generating resources:', generationError);
          throw generationError;
        }

        console.log('Resources generated successfully:', generatedData);

        if (!Array.isArray(generatedData?.[0]?.resources)) {
          console.error('Invalid resources format:', generatedData);
          throw new Error('Invalid resources format received');
        }

        // Store the generated resources
        const resourcesToStore = generatedData[0].resources.map((resource: Resource) => ({
          lecture_id: numericLectureId,
          segment_number: sequenceNumber,
          resource_type: resource.type,
          title: resource.title,
          url: resource.url,
          description: resource.description
        }));

        const { error: insertError } = await supabase
          .from('lecture_additional_resources')
          .insert(resourcesToStore);

        if (insertError) {
          console.error('Error storing generated resources:', insertError);
          throw insertError;
        }

        console.log('Resources stored successfully');

        // Group the resources by type for display
        const groupedResources = generatedData[0].resources.reduce((acc: { [key: string]: Resource[] }, resource: Resource) => {
          if (!acc[resource.type]) acc[resource.type] = [];
          acc[resource.type].push(resource);
          return acc;
        }, {});

        return {
          segments: [{
            id: `segment_${sequenceNumber}`,
            title: 'Additional Learning Resources',
            description: 'Curated resources to enhance your understanding',
            resources: groupedResources
          }]
        };
      } catch (error) {
        console.error('Error in generate-resources function:', error);
        throw error;
      }
    },
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });
};

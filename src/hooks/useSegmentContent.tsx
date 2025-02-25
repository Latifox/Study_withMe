
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSegmentContent = (numericLectureId: number | null) => {
  return useQuery({
    queryKey: ['segment-content', numericLectureId],
    queryFn: async () => {
      console.log('useSegmentContent: Starting fetch for lecture:', numericLectureId);

      if (!numericLectureId) {
        console.error('Missing lecture ID:', { numericLectureId });
        throw new Error('Invalid parameters');
      }

      // First check if resources already exist
      const { data: existingResources, error: resourcesError } = await supabase
        .from('lecture_additional_resources')
        .select('*')
        .eq('lecture_id', numericLectureId);

      if (resourcesError) {
        console.error('Error fetching existing resources:', resourcesError);
        throw resourcesError;
      }

      // If resources exist, return them grouped by segment
      if (existingResources && existingResources.length > 0) {
        console.log('Found existing resources:', existingResources);
        
        // Group resources by segment number
        const groupedBySegment = existingResources.reduce((acc, resource) => {
          const segNum = resource.segment_number;
          if (!acc[segNum]) acc[segNum] = { markdown: '' };
          const markdownResource = `
## ${resource.resource_type === 'video' ? 'Video Resources' : 
       resource.resource_type === 'article' ? 'Article Resources' : 
       'Research Papers'}
1. [${resource.title}](${resource.url})
   Description: ${resource.description}
`;
          acc[segNum].markdown += markdownResource;
          return acc;
        }, {});

        return {
          segments: Object.entries(groupedBySegment).map(([segmentNumber, content]) => ({
            id: `segment_${segmentNumber}`,
            content: content.markdown
          }))
        };
      }

      // If no resources exist, we need to generate them
      console.log('No existing resources found, fetching segment titles...');

      // First get all segment titles for this lecture
      const { data: segmentData, error: segmentError } = await supabase
        .from('lecture_segments')
        .select('sequence_number, title')
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

      console.log('Generating resources for segments:', segmentData);

      const segmentContents = await Promise.all(segmentData.map(async (segment) => {
        // Generate resources using the edge function with the segment title
        const { data: generatedContent, error: generationError } = await supabase.functions.invoke('generate-resources', {
          body: { topic: segment.title, language: 'spanish' }
        });

        if (generationError) {
          console.error(`Error generating resources for segment ${segment.sequence_number}:`, generationError);
          throw generationError;
        }

        const content = generatedContent.content;
        
        // Store the markdown content in the database
        const { error: insertError } = await supabase
          .from('lecture_additional_resources')
          .insert({
            lecture_id: numericLectureId,
            segment_number: segment.sequence_number,
            content: content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error storing generated content:', insertError);
          throw insertError;
        }

        return {
          id: `segment_${segment.sequence_number}`,
          content: content
        };
      }));

      return { segments: segmentContents };
    },
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });
};

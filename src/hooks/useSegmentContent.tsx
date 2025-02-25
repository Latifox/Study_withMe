
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

      // First check if resources already exist
      const { data: existingResources, error: resourcesError } = await supabase
        .from('lecture_additional_resources')
        .select('*, lecture_segments!inner(title)')
        .eq('lecture_id', numericLectureId)
        .order('segment_number, resource_type');

      if (resourcesError) {
        console.error('Error fetching existing resources:', resourcesError);
        throw resourcesError;
      }

      // If resources exist, return them grouped by segment
      if (existingResources && existingResources.length > 0) {
        console.log('Found existing resources:', existingResources);
        
        // Group resources by segment number
        const groupedBySegment = existingResources.reduce((acc: Record<number, { title: string, content: string }>, resource) => {
          const segNum = resource.segment_number;
          if (!acc[segNum]) {
            acc[segNum] = { 
              title: resource.lecture_segments.title,
              content: '' 
            };
          }
          
          // Determine section header based on resource type
          let sectionHeader = '';
          switch (resource.resource_type) {
            case 'video':
              if (!acc[segNum].content.includes('Video Resources')) {
                sectionHeader = '\n## Video Resources\n';
              }
              break;
            case 'article':
              if (!acc[segNum].content.includes('Article Resources')) {
                sectionHeader = '\n## Article Resources\n';
              }
              break;
            case 'research_paper':
              if (!acc[segNum].content.includes('Research Papers')) {
                sectionHeader = '\n## Research Papers\n';
              }
              break;
          }
          
          const resourceMarkdown = `${sectionHeader}${!sectionHeader ? '' : ''}1. [${resource.title}](${resource.url})
   Description: ${resource.description}\n`;
          
          acc[segNum].content += resourceMarkdown;
          return acc;
        }, {});

        return {
          segments: Object.entries(groupedBySegment).map(([segmentNumber, data]) => ({
            id: `segment_${segmentNumber}`,
            title: data.title,
            content: data.content.trim()
          }))
        };
      }

      // If no resources exist, fetch all segment titles and generate resources for each
      console.log('No existing resources found, fetching segment titles...');

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

      console.log('Retrieved segments for processing:', segmentData);

      // Process all segments in parallel with retry logic
      const processSegment = async (segment: { sequence_number: number; title: string }, retryCount = 0) => {
        const maxRetries = 3;
        try {
          console.log(`Starting resource generation for segment ${segment.sequence_number}: ${segment.title}`);
          
          const { data: generatedContent, error: generationError } = await supabase.functions.invoke('generate-resources', {
            body: { topic: segment.title, language: 'spanish' }
          });

          if (generationError) {
            throw generationError;
          }

          // Parse the markdown into sections and extract resources
          const sections = generatedContent.markdown.split('\n## ');
          const resources = [];
          let currentType = '';

          for (const section of sections) {
            if (section.includes('Video Resources')) {
              currentType = 'video';
            } else if (section.includes('Article Resources')) {
              currentType = 'article';
            } else if (section.includes('Research Papers')) {
              currentType = 'research_paper';
            }

            // Extract resources from the section using regex
            const resourceMatches = section.matchAll(/\d\.\s+\[(.*?)\]\((.*?)\)\s+Description:\s+(.*?)(?=\n|$)/g);
            for (const match of resourceMatches) {
              resources.push({
                title: match[1],
                url: match[2],
                description: match[3],
                type: currentType
              });
            }
          }

          // Store resources in the database
          console.log(`Storing ${resources.length} resources for segment ${segment.sequence_number}`);
          
          await Promise.all(resources.map(async (resource) => {
            const { error: insertError } = await supabase
              .from('lecture_additional_resources')
              .insert({
                lecture_id: numericLectureId,
                segment_number: segment.sequence_number,
                resource_type: resource.type,
                title: resource.title,
                url: resource.url,
                description: resource.description
              });

            if (insertError) {
              console.error(`Error storing resource for segment ${segment.sequence_number}:`, insertError);
              throw insertError;
            }
          }));

          console.log(`Successfully stored resources for segment ${segment.sequence_number}`);
          
          return {
            id: `segment_${segment.sequence_number}`,
            title: segment.title,
            content: generatedContent.markdown
          };
        } catch (error) {
          console.error(`Error processing segment ${segment.sequence_number}:`, error);
          
          if (retryCount < maxRetries) {
            console.log(`Retrying segment ${segment.sequence_number} (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
            return processSegment(segment, retryCount + 1);
          }
          
          toast({
            title: `Error generating resources for segment ${segment.sequence_number}`,
            description: "Please try again later",
            variant: "destructive",
          });
          throw error;
        }
      };

      try {
        console.log('Processing all segments in parallel...');
        const segmentContents = await Promise.all(
          segmentData.map(segment => processSegment(segment))
        );
        console.log('Finished processing all segments:', segmentContents);
        
        return { segments: segmentContents };
        
      } catch (error) {
        console.error('Error processing segments:', error);
        throw error;
      }
    },
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });
};


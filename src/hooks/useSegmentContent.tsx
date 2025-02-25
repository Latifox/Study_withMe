
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
        .select('*, lecture_segments!inner(title, segment_description)')
        .eq('lecture_id', numericLectureId)
        .order('sequence_number, resource_type');

      if (resourcesError) {
        console.error('Error fetching existing resources:', resourcesError);
        throw resourcesError;
      }

      // If resources exist, return them grouped by segment
      if (existingResources && existingResources.length > 0) {
        console.log('Found existing resources:', existingResources);
        
        const groupedBySegment = existingResources.reduce((acc: Record<number, { title: string, content: string }>, resource) => {
          const seqNum = resource.sequence_number;
          if (!acc[seqNum]) {
            acc[seqNum] = { 
              title: resource.lecture_segments.title,
              content: '' 
            };
          }
          
          let sectionHeader = '';
          switch (resource.resource_type) {
            case 'video':
              if (!acc[seqNum].content.includes('Video Resources')) {
                sectionHeader = '\n## Video Resources\n';
              }
              break;
            case 'article':
              if (!acc[seqNum].content.includes('Article Resources')) {
                sectionHeader = '\n## Article Resources\n';
              }
              break;
            case 'research_paper':
              if (!acc[seqNum].content.includes('Research Papers')) {
                sectionHeader = '\n## Research Papers\n';
              }
              break;
          }
          
          const resourceMarkdown = `${sectionHeader}${!sectionHeader ? '' : ''}1. [${resource.title}](${resource.url})
   Description: ${resource.description}\n`;
          
          acc[seqNum].content += resourceMarkdown;
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

      // Fetch the AI configuration for the lecture
      console.log('Fetching AI configuration for lecture:', numericLectureId);
      const { data: aiConfig, error: aiConfigError } = await supabase
        .from('lecture_ai_configs')
        .select('content_language')
        .eq('lecture_id', numericLectureId)
        .single();

      if (aiConfigError) {
        console.error('Error fetching AI config:', aiConfigError);
        throw aiConfigError;
      }

      // Fetch all segment titles and descriptions
      console.log('No existing resources found, fetching segment details...');
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

      const processSegment = async (segment: { sequence_number: number; title: string; segment_description: string }, retryCount = 0) => {
        const maxRetries = 3;
        const retryDelay = (retryCount: number) => Math.min(2000 * Math.pow(2, retryCount), 10000);

        try {
          console.log(`Starting resource generation for segment ${segment.sequence_number}: ${segment.title}`);
          
          const { data: generatedContent, error: generationError } = await supabase.functions.invoke('generate-resources', {
            body: { 
              topic: segment.title,
              description: segment.segment_description,
              language: aiConfig?.content_language || 'english'
            }
          });

          if (generationError) {
            throw generationError;
          }

          if (!generatedContent?.markdown) {
            throw new Error('No content generated');
          }

          console.log('Generated content:', generatedContent.markdown);

          // More flexible resource extraction
          const sections = generatedContent.markdown.split(/##\s+/);
          const resources = [];
          
          for (const section of sections) {
            let currentType = '';
            
            if (section.toLowerCase().includes('video')) {
              currentType = 'video';
            } else if (section.toLowerCase().includes('article')) {
              currentType = 'article';
            } else if (section.toLowerCase().includes('research')) {
              currentType = 'research_paper';
            }

            if (currentType) {
              const pattern = /\d*\.*\s*\[([^\]]+)\]\(([^)]+)\)(?:[\s\n]*(?:Description|description)?:?\s*([^\n]+))?/g;
              const matches: RegExpMatchArray[] = Array.from(section.matchAll(pattern));
              
              for (const match of matches) {
                const [_, title, url, description = ''] = match;
                if (title && url) {
                  resources.push({
                    title: title.trim(),
                    url: url.trim(),
                    description: description.trim() || `Resource about ${segment.title}`,
                    type: currentType
                  });
                }
              }
            }
          }

          if (resources.length === 0) {
            throw new Error('No valid resources found in generated content');
          }

          console.log(`Found ${resources.length} resources to store`);
          
          for (const resource of resources) {
            const { error: insertError } = await supabase
              .from('lecture_additional_resources')
              .insert({
                lecture_id: numericLectureId,
                sequence_number: segment.sequence_number,
                resource_type: resource.type,
                title: resource.title,
                url: resource.url,
                description: resource.description
              });

            if (insertError) {
              console.error(`Error storing resource:`, insertError);
              throw insertError;
            }
          }

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
            await new Promise(resolve => setTimeout(resolve, retryDelay(retryCount)));
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

      // Process segments sequentially
      try {
        const results = [];
        for (const segment of segmentData) {
          const content = await processSegment(segment);
          results.push(content);
        }
        
        console.log('Finished processing all segments:', results);
        return { segments: results };
      } catch (error) {
        console.error('Error processing segments:', error);
        throw error;
      }
    },
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });
};

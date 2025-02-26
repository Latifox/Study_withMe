
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Segment {
  title: string;
  segment_description: string;
}

interface Resource {
  title: string;
  url: string;
  description: string;
  resource_type: string;
}

export const useGenerateResources = (segment: Segment | null) => {
  return useQuery({
    queryKey: ["resources", segment?.title],
    queryFn: async () => {
      if (!segment) {
        throw new Error("No segment provided");
      }

      // First try to get existing resources
      const { data: existingResources, error: fetchError } = await supabase
        .from('lecture_additional_resources')
        .select('*')
        .eq('title', segment.title);

      if (fetchError) {
        console.error("Error fetching existing resources:", fetchError);
        throw fetchError;
      }

      // If we have existing resources, format and return them
      if (existingResources && existingResources.length > 0) {
        console.log('Found existing resources:', existingResources);
        return formatResourcesToMarkdown(existingResources);
      }

      // If no resources exist, generate new ones
      console.log('No existing resources found, generating new ones for:', {
        topic: segment.title,
        description: segment.segment_description
      });

      const { data: generatedData, error } = await supabase.functions.invoke("generate-resources", {
        body: {
          topic: segment.title,
          description: segment.segment_description
        }
      });

      if (error) {
        console.error("Error generating resources:", error);
        toast({
          title: "Error generating resources",
          description: "Failed to generate resources. Please try again.",
          variant: "destructive",
        });
        throw error;
      }

      if (!generatedData?.markdown) {
        throw new Error("No resources generated");
      }

      // Store the generated resources in the database
      if (generatedData.resources) {
        try {
          const { error: insertError } = await supabase
            .from('lecture_additional_resources')
            .insert(
              generatedData.resources.map((resource: Resource, index: number) => ({
                lecture_id: segment.lecture_id,
                sequence_number: index + 1,
                title: segment.title,
                ...resource
              }))
            );

          if (insertError) {
            console.error("Error storing resources:", insertError);
          }
        } catch (storeError) {
          console.error("Error storing generated resources:", storeError);
        }
      }

      return generatedData.markdown;
    },
    enabled: !!segment,
    retry: false,
    retryOnMount: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

function formatResourcesToMarkdown(resources: any[]): string {
  const sections: { [key: string]: any[] } = {};
  
  // Group resources by type
  resources.forEach(resource => {
    if (!sections[resource.resource_type]) {
      sections[resource.resource_type] = [];
    }
    sections[resource.resource_type].push(resource);
  });

  // Convert to markdown
  let markdown = "## Additional Learning Resources\n\n";
  
  Object.entries(sections).forEach(([type, items]) => {
    markdown += `### ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n`;
    items.forEach(item => {
      markdown += `- [${item.title}](${item.url})\n  ${item.description}\n\n`;
    });
  });

  return markdown;
}


import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Segment {
  title: string;
  segment_description: string;
}

export const useGenerateResources = (segment: Segment | null) => {
  return useQuery({
    queryKey: ["resources", segment?.title],
    queryFn: async () => {
      if (!segment) {
        throw new Error("No segment provided");
      }

      console.log('Calling generate-resources function with:', {
        topic: segment.title,
        description: segment.segment_description
      });

      const { data, error } = await supabase.functions.invoke("generate-resources", {
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

      if (!data?.markdown) {
        throw new Error("No resources generated");
      }

      return data.markdown;
    },
    enabled: !!segment,
    retry: false, // Disable retries
    retryOnMount: false, // Prevent retrying on mount
    staleTime: Infinity, // Prevent automatic refetching
    gcTime: Infinity, // Keep the data cached indefinitely (formerly cacheTime)
  });
};

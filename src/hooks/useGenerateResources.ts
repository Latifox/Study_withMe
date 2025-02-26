
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Segment {
  title: string;
  segment_description: string;
  lecture_id: number;
}

export const useGenerateResources = (segment: Segment | null) => {
  return useQuery({
    queryKey: ["resources", segment?.title, segment?.lecture_id],
    queryFn: async () => {
      if (!segment) {
        throw new Error("No segment provided");
      }

      console.log('Fetching resources for segment:', {
        title: segment.title,
        lecture_id: segment.lecture_id
      });

      // First try to get existing resources
      const { data: existingContent, error: fetchError } = await supabase
        .from('lecture_additional_resources')
        .select('content')
        .eq('title', segment.title)
        .eq('lecture_id', segment.lecture_id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching existing resources:", fetchError);
        throw fetchError;
      }

      // If we have existing content, return it
      if (existingContent) {
        console.log('Found existing resources content');
        return existingContent.content;
      }

      // If no resources exist, generate new ones using the generate-resources function
      console.log('Generating new resources using generate-resources function');
      const { data: generatedData, error } = await supabase.functions.invoke("generate-resources", {
        body: {
          topic: segment.title,
          description: segment.segment_description,
          lecture_id: segment.lecture_id
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

      console.log('Generated data:', generatedData);

      if (!generatedData?.markdown) {
        throw new Error("Invalid response from generate-resources function");
      }

      // Store the generated markdown in the database
      const { error: insertError } = await supabase
        .from('lecture_additional_resources')
        .insert({
          lecture_id: segment.lecture_id,
          title: segment.title,
          content: generatedData.markdown
        });

      if (insertError) {
        console.error("Error storing resources:", insertError);
        // Even if storage fails, return the markdown
      }

      return generatedData.markdown;
    },
    enabled: !!segment,
    retry: 1,
    retryDelay: 1000,
  });
};


import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PodcastData {
  id: number;
  lecture_id: number;
  host_script: string;
  expert_script: string;
  student_script: string;
  full_script: string;
  is_processed: boolean;
  created_at: string;
  updated_at: string;
}

export function useGeneratePodcast() {
  const [isLoading, setIsLoading] = useState(false);
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const { toast } = useToast();

  const generatePodcast = async (lectureId: string | number): Promise<PodcastData | null> => {
    setIsLoading(true);
    try {
      const numericLectureId = typeof lectureId === 'string' ? parseInt(lectureId, 10) : lectureId;

      const { data, error } = await supabase.functions.invoke('generate-podcast-conversation', {
        body: { lectureId: numericLectureId }
      });

      if (error) {
        console.error("Error generating podcast:", error);
        toast({
          title: "Error",
          description: `Failed to generate podcast: ${error.message}`,
          variant: "destructive"
        });
        return null;
      }

      if (data.success) {
        const podcastData = data.podcast as PodcastData;
        setPodcast(podcastData);
        
        if (data.isExisting) {
          toast({
            title: "Podcast Loaded",
            description: "Using existing podcast for this lecture",
          });
        } else {
          toast({
            title: "Podcast Generated",
            description: "Created a new podcast for this lecture",
          });
        }
        
        return podcastData;
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to generate podcast",
          variant: "destructive"
        });
        return null;
      }
    } catch (err) {
      console.error("Exception generating podcast:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generatePodcast,
    podcast,
    isLoading,
  };
}

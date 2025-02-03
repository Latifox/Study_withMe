import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LearningPathway from "@/components/story/LearningPathway";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StoryLoading from "@/components/story/StoryLoading";
import StoryError from "@/components/story/StoryError";
import { useToast } from "@/hooks/use-toast";

const StoryNodes = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [completedNodes] = useState(new Set<string>());
  const { toast } = useToast();

  const { data: storyContent, isLoading, error } = useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      console.log('Fetching story structure for lecture:', lectureId);

      const { data: storyStructure, error: structureError } = await supabase
        .from('story_structures')
        .select('*')
        .eq('lecture_id', parseInt(lectureId))
        .maybeSingle();

      if (structureError) {
        console.error('Error fetching story structure:', structureError);
        throw structureError;
      }

      if (!storyStructure) {
        console.log('No story structure found, generating new content...');
        const { data: generatedStructure, error: generationError } = await supabase.functions.invoke('generate-story-content', {
          body: { lectureId: parseInt(lectureId) }
        });

        if (generationError) {
          console.error('Error generating story content:', generationError);
          throw generationError;
        }

        console.log('Successfully generated new story structure:', generatedStructure);
        return {
          segments: Array.from({ length: 10 }, (_, i) => ({
            id: `segment_${i + 1}`,
            title: generatedStructure.storyStructure[`segment_${i + 1}_title`] || `Lesson ${i + 1}`,
            type: (i % 3 === 0 ? "quiz" : "concept") as "concept" | "quiz" | "challenge",
            difficulty: (i < 3 ? "beginner" : i < 7 ? "intermediate" : "advanced") as "beginner" | "intermediate" | "advanced",
            prerequisites: i === 0 ? [] : [`segment_${i}`],
            points: (i + 1) * 10,
            description: `Master the concepts of ${generatedStructure.storyStructure[`segment_${i + 1}_title`] || `Lesson ${i + 1}`}`,
          }))
        };
      }

      return {
        segments: Array.from({ length: 10 }, (_, i) => ({
          id: `segment_${i + 1}`,
          title: storyStructure[`segment_${i + 1}_title`] || `Lesson ${i + 1}`,
          type: (i % 3 === 0 ? "quiz" : "concept") as "concept" | "quiz" | "challenge",
          difficulty: (i < 3 ? "beginner" : i < 7 ? "intermediate" : "advanced") as "beginner" | "intermediate" | "advanced",
          prerequisites: i === 0 ? [] : [`segment_${i}`],
          points: (i + 1) * 10,
          description: `Master the concepts of ${storyStructure[`segment_${i + 1}_title`] || `Lesson ${i + 1}`}`,
        }))
      };
    },
    retry: 1
  });

  const handleBack = () => {
    navigate(`/course/${courseId}`);
  };

  const handleNodeSelect = async (nodeId: string) => {
    // Extract segment number from nodeId (e.g., "segment_1" -> 1)
    const segmentNumber = parseInt(nodeId.split('_')[1]);
    const segmentTitle = storyContent?.segments[segmentNumber - 1]?.title;

    if (!segmentTitle) {
      toast({
        title: "Error",
        description: "Could not find segment title",
        variant: "destructive"
      });
      return;
    }

    try {
      // Generate content for the selected segment
      const { data, error } = await supabase.functions.invoke('generate-segment-content', {
        body: {
          lectureId: parseInt(lectureId!),
          segmentNumber,
          segmentTitle
        }
      });

      if (error) {
        console.error('Error generating segment content:', error);
        toast({
          title: "Error",
          description: "Failed to generate segment content",
          variant: "destructive"
        });
        return;
      }

      // Navigate to the content page
      navigate(`/course/${courseId}/lecture/${lectureId}/story/content/${nodeId}`);
    } catch (error) {
      console.error('Error handling node selection:', error);
      toast({
        title: "Error",
        description: "Failed to load segment content",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <StoryLoading />
      </div>
    );
  }

  if (error || !storyContent) {
    return (
      <div className="container mx-auto p-4">
        <StoryError 
          message={error instanceof Error ? error.message : "Failed to load story content"}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Course
      </Button>

      <Card className="p-6 bg-white/50 backdrop-blur-sm">
        <LearningPathway
          nodes={storyContent.segments}
          completedNodes={completedNodes}
          currentNode={null}
          onNodeSelect={handleNodeSelect}
        />
      </Card>
    </div>
  );
};

export default StoryNodes;
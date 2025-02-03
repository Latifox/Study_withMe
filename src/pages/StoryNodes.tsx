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

const StoryNodes = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [completedNodes] = useState(new Set<string>());

  const { data: storyContent, isLoading, error } = useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');

      const { data: storyStructure, error: structureError } = await supabase
        .from('story_structures')
        .select('*')
        .eq('lecture_id', parseInt(lectureId))
        .single();

      if (structureError) throw structureError;
      if (!storyStructure) throw new Error('Story structure not found');

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
    }
  });

  const handleBack = () => {
    navigate(`/course/${courseId}`);
  };

  const handleNodeSelect = (nodeId: string) => {
    navigate(`/course/${courseId}/lecture/${lectureId}/story/content/${nodeId}`);
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
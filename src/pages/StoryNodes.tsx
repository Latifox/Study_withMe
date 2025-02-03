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
          title: storyStructure[`segment_${i + 1}_title`],
          description: `Learn about ${storyStructure[`segment_${i + 1}_title`]}`,
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
      <div className="container mx-auto p-2">
        <StoryLoading />
      </div>
    );
  }

  if (error || !storyContent) {
    return (
      <div className="container mx-auto p-2">
        <StoryError 
          message={error instanceof Error ? error.message : "Failed to load story content"}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-4"
      >
        <ArrowLeft className="mr-2" />
        Back to Course
      </Button>

      <Card className="p-4">
        <h1 className="text-2xl font-bold mb-6">Learning Pathway</h1>
        <LearningPathway
          nodes={storyContent.segments.map(segment => ({
            id: segment.id,
            title: segment.title || '',
            type: "concept",
            difficulty: "intermediate",
            prerequisites: [],
            points: 10,
            description: segment.description || '',
          }))}
          completedNodes={completedNodes}
          currentNode={null}
          onNodeSelect={handleNodeSelect}
        />
      </Card>
    </div>
  );
};

export default StoryNodes;
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStoryContent } from "@/hooks/useStoryContent";
import LearningPathwayComponent from "@/components/story/LearningPathway";
import StoryHeader from "@/components/story/StoryHeader";
import StoryLoading from "@/components/story/StoryLoading";
import StoryError from "@/components/story/StoryError";

const LearningPathway = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [completedNodes] = useState(new Set<string>());

  const { 
    data: storyContent,
    isLoading: isLoadingStory,
    error: storyError,
  } = useStoryContent(lectureId);

  const handleBack = () => {
    navigate(`/course/${courseId}`);
  };

  const handleNodeSelect = (nodeId: string) => {
    if (!storyContent?.segments) return;
    const index = storyContent.segments.findIndex(s => s.id === nodeId);
    if (index === -1) return;
    navigate(`/course/${courseId}/lecture/${lectureId}/story/segment/${index}`);
  };

  if (isLoadingStory) {
    return (
      <div className="container mx-auto p-2">
        <StoryLoading />
      </div>
    );
  }

  if (storyError) {
    return (
      <div className="container mx-auto p-2">
        <StoryError 
          message={storyError instanceof Error ? storyError.message : "Failed to load story content"}
          onBack={handleBack}
        />
      </div>
    );
  }

  if (!storyContent?.segments?.length) {
    return (
      <div className="container mx-auto p-2">
        <StoryLoading />
      </div>
    );
  }

  const pathwayNodes = storyContent.segments.map((segment, index) => ({
    id: segment.id,
    title: segment.title,
    type: "concept" as const,
    difficulty: "intermediate" as const,
    prerequisites: index > 0 ? [storyContent.segments[index - 1].id] : [],
    points: 10,
    description: segment.description,
  }));

  return (
    <div className="container mx-auto p-2">
      <StoryHeader onBack={handleBack} />
      <LearningPathwayComponent
        nodes={pathwayNodes}
        completedNodes={completedNodes}
        currentNode={null}
        onNodeSelect={handleNodeSelect}
      />
    </div>
  );
};

export default LearningPathway;
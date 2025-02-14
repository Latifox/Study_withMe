
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StoryCompletionScreen from "@/components/story/StoryCompletionScreen";
import StoryLoading from "@/components/story/StoryLoading";
import StoryError from "@/components/story/StoryError";
import StoryScoreHeader from "@/components/story/StoryScoreHeader";
import StoryMainContent from "@/components/story/StoryMainContent";
import { useSegmentContent } from "@/hooks/useSegmentContent";
import { useSegmentProgress } from "@/hooks/useSegmentProgress";
import { useStoryContentHandler } from "@/components/story/StoryContentHandler";

const StoryContent = () => {
  const { courseId, lectureId, nodeId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const sequenceNumber = nodeId ? parseInt(nodeId.split('_')[1]) : null;
  const numericLectureId = lectureId ? parseInt(lectureId) : null;

  const { segmentScores, setSegmentScores } = useSegmentProgress(nodeId, numericLectureId, sequenceNumber);
  const { data: content, isLoading, error } = useSegmentContent(numericLectureId, sequenceNumber);
  
  const { handleContinue, handleCorrectAnswer, handleWrongAnswer } = useStoryContentHandler({
    nodeId,
    numericLectureId,
    sequenceNumber,
    currentStep,
    segmentScores,
    setSegmentScores,
    setCurrentStep
  });

  const handleBack = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/story/nodes`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <StoryLoading />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="container mx-auto p-4">
        <StoryError 
          message={error instanceof Error ? error.message : "Failed to load segment content"}
          onBack={handleBack}
        />
      </div>
    );
  }

  const currentScore = segmentScores[nodeId || ''] || 0;

  if (currentStep >= 4 && currentScore >= 10) {
    return <StoryCompletionScreen onBack={handleBack} />;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <StoryScoreHeader
        currentScore={currentScore}
        currentStep={currentStep}
        onBack={handleBack}
      />
      <StoryMainContent
        content={content}
        currentStep={currentStep}
        segmentScores={segmentScores}
        onContinue={handleContinue}
        onCorrectAnswer={handleCorrectAnswer}
        onWrongAnswer={handleWrongAnswer}
      />
    </div>
  );
};

export default StoryContent;

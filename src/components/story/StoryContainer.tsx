
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import StoryCompletionScreen from "./StoryCompletionScreen";
import ContentDisplay from "./content/ContentDisplay";

interface StoryContainerProps {
  storyContent: {
    segments: Array<{
      id: string;
      title: string;
      slides: any[];  // Changed from optional to required
      questions: any[];  // Changed from optional to required
    }>;
  };
  currentSegment: number;
  currentStep: number;
  segmentScores: { [key: string]: number };
  onContinue: () => void;
  onCorrectAnswer: () => void;
  onWrongAnswer: () => void;
}

export const StoryContainer = ({
  storyContent,
  currentSegment,
  currentStep,
  segmentScores,
  onContinue,
  onCorrectAnswer,
  onWrongAnswer
}: StoryContainerProps) => {
  const { courseId, lectureId } = useParams();
  const currentSegmentData = storyContent.segments[currentSegment];
  const isSlide = currentStep < 2;
  const slideIndex = currentStep;
  const questionIndex = currentStep - 2;
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [currentScore, setCurrentScore] = useState(segmentScores[currentSegmentData?.id] || 0);

  // If we don't have slides or questions yet, show loading state
  if (!currentSegmentData || !Array.isArray(currentSegmentData.slides) || !Array.isArray(currentSegmentData.questions)) {
    return (
      <Card className="p-2">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="ml-3 text-sm text-muted-foreground">
            Loading segment content...
          </p>
        </div>
      </Card>
    );
  }

  if (showCompletionScreen) {
    return <StoryCompletionScreen onBack={() => window.history.back()} />;
  }

  return (
    <ContentDisplay
      currentSegmentData={currentSegmentData}
      currentSegment={currentSegment}
      currentStep={currentStep}
      totalSegments={storyContent.segments.length}
      currentScore={currentScore}
      isSlide={isSlide}
      slideIndex={slideIndex}
      questionIndex={questionIndex}
      lectureId={lectureId}
      courseId={courseId}
      onContinue={onContinue}
      onCorrectAnswer={() => {
        setShowCompletionScreen(true);
        onCorrectAnswer();
      }}
      onWrongAnswer={onWrongAnswer}
    />
  );
};

export default StoryContainer;

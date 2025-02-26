
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import StoryCompletionScreen from "./StoryCompletionScreen";
import ContentDisplay from "./content/ContentDisplay";

interface StoryContainerProps {
  storyContent: {
    segments: Array<{
      theory_slide_1: string;
      theory_slide_2: string;
      quiz_1_type: string;
      quiz_1_question: string;
      quiz_1_options?: string[];
      quiz_1_correct_answer: string;
      quiz_1_explanation: string;
      quiz_2_type: string;
      quiz_2_question: string;
      quiz_2_correct_answer: boolean;
      quiz_2_explanation: string;
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
  const { nodeId } = useParams();
  // Get the actual sequence number from the URL without subtracting 1
  const sequenceNumber = nodeId ? parseInt(nodeId.split('_')[1]) : 1;
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [currentScore, setCurrentScore] = useState(segmentScores[nodeId || ''] || 0);

  console.log('Current URL nodeId:', nodeId);
  console.log('Sequence number:', sequenceNumber);
  console.log('Story content:', storyContent);
  console.log('Story content segments length:', storyContent?.segments?.length);
  
  // Add null check for storyContent and its segments
  if (!storyContent || !storyContent.segments) {
    return (
      <Card className="p-2">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="ml-3 text-sm text-muted-foreground">
            Loading content...
          </p>
        </div>
      </Card>
    );
  }

  // Find the segment data that matches the sequence number
  const currentSegmentData = storyContent.segments.find((_, index) => index === sequenceNumber - 1);
  const isSlide = currentStep < 2;
  const slideIndex = currentStep;
  const questionIndex = currentStep - 2;

  console.log('Current segment data:', currentSegmentData);

  // If we don't have segment content yet, show loading state
  if (!currentSegmentData) {
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
      currentSegment={sequenceNumber}
      currentStep={currentStep}
      totalSegments={storyContent.segments.length}
      currentScore={currentScore}
      isSlide={isSlide}
      slideIndex={slideIndex}
      questionIndex={questionIndex}
      lectureId={String(currentSegment)}
      courseId={String(currentSegment)}
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

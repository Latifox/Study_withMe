
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
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
      quiz_2_correct_answer: boolean | string;
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
  const sequenceNumber = nodeId ? parseInt(nodeId.split('_')[1]) : 1;
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [currentScore, setCurrentScore] = useState(segmentScores[nodeId || ''] || 0);

  console.log('StoryContainer - Current segment:', sequenceNumber);
  console.log('StoryContainer - Story content:', storyContent);
  console.log('StoryContainer - Current step:', currentStep);

  // Validate story content structure
  if (!storyContent || !Array.isArray(storyContent.segments)) {
    console.error('Invalid story content structure:', storyContent);
    toast({
      title: "Error loading content",
      description: "Unable to load segment content. Please try refreshing the page.",
      variant: "destructive",
    });
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

  // Get current segment data
  const currentSegmentData = storyContent.segments[sequenceNumber - 1];
  console.log('StoryContainer - Current segment data:', currentSegmentData);

  if (!currentSegmentData) {
    console.error('No segment data found for sequence:', sequenceNumber);
    toast({
      title: "Missing segment data",
      description: "Unable to find content for this segment. Please try again.",
      variant: "destructive",
    });
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
      isSlide={currentStep < 2}
      slideIndex={currentStep}
      questionIndex={currentStep - 2}
      lectureId={String(currentSegment)}
      courseId={String(currentSegment)}
      onContinue={onContinue}
      onCorrectAnswer={() => {
        setCurrentScore(prev => prev + 5);
        setShowCompletionScreen(true);
        onCorrectAnswer();
      }}
      onWrongAnswer={onWrongAnswer}
    />
  );
};

export default StoryContainer;

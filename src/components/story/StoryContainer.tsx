
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";
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
  const { nodeId, courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [currentScore, setCurrentScore] = useState(segmentScores[nodeId || ''] || 0);

  console.log('StoryContainer - Current segment:', currentSegment);
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

  // Get current segment data, using 0-indexed array with 1-indexed currentSegment
  const currentSegmentIndex = currentSegment - 1;
  const currentSegmentData = storyContent.segments[currentSegmentIndex];
  console.log('StoryContainer - Current segment index:', currentSegmentIndex);
  console.log('StoryContainer - Current segment data:', currentSegmentData);

  if (!currentSegmentData) {
    console.error('No segment data found for segment:', currentSegment, 'index:', currentSegmentIndex);
    toast({
      title: "Missing segment data",
      description: `Unable to find content for segment ${currentSegment}. Please try again.`,
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

  // Function to proceed to the next segment
  const proceedToNextSegment = () => {
    const nextSegment = currentSegment + 1;
    
    // Check if there is a next segment available
    if (nextSegment <= storyContent.segments.length) {
      // Navigate to the next segment
      navigate(`/course/${courseId}/lecture/${lectureId}/story/content/segment_${nextSegment}`);
      // Reset step to 0 for the new segment
      onContinue();
      toast({
        title: "Segment Complete!",
        description: "Moving to the next segment...",
      });
    } else {
      // If this was the last segment, show completion screen
      setShowCompletionScreen(true);
      toast({
        title: "All Segments Complete!",
        description: "Congratulations on completing all segments!",
      });
    }
  };

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
      isSlide={currentStep < 2}
      slideIndex={currentStep}
      questionIndex={currentStep - 2}
      lectureId={String(lectureId)}
      courseId={String(courseId)}
      onContinue={onContinue}
      onCorrectAnswer={() => {
        setCurrentScore(prev => prev + 5);
        
        // Check if this is the final quiz (currentStep === 3)
        if (currentStep === 3) {
          // Save the correct answer through the parent handler
          onCorrectAnswer();
          
          // Instead of immediately showing completion, proceed to next segment
          proceedToNextSegment();
        } else {
          // Not the final quiz, continue as usual
          onCorrectAnswer();
          onContinue();
        }
      }}
      onWrongAnswer={onWrongAnswer}
    />
  );
};

export default StoryContainer;

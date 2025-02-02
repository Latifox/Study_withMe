import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import TheorySlide from "./TheorySlide";
import StoryQuiz from "./StoryQuiz";
import SegmentProgress from "./SegmentProgress";
import StoryProgress from "./StoryProgress";
import { StoryContent, SegmentContent } from "@/hooks/useStoryContent";

interface StoryContainerProps {
  storyContent: {
    segments: Array<{
      id: string;
      title: string;
      slides?: SegmentContent['slides'];
      questions?: SegmentContent['questions'];
    }>;
  };
  currentSegment: number;
  currentStep: number;
  segmentScores: { [key: string]: number };
  onContinue: () => void;
  onCorrectAnswer: () => void;
  onWrongAnswer: () => void;
}

const TOTAL_QUESTIONS_PER_SEGMENT = 2;
const POINTS_PER_CORRECT_ANSWER = 5;

export const StoryContainer = ({
  storyContent,
  currentSegment,
  currentStep,
  segmentScores,
  onContinue,
  onCorrectAnswer,
  onWrongAnswer
}: StoryContainerProps) => {
  const currentSegmentData = storyContent.segments[currentSegment];
  const isSlide = currentStep < 2;
  const slideIndex = currentStep;
  const questionIndex = currentStep - 2;
  const maxScore = TOTAL_QUESTIONS_PER_SEGMENT * POINTS_PER_CORRECT_ANSWER;
  const currentScore = segmentScores[currentSegmentData.id] || 0;

  if (!currentSegmentData.slides || !currentSegmentData.questions) {
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

  return (
    <Card className="p-2">
      <div className="mb-2">
        <SegmentProgress
          currentSegment={currentSegment}
          totalSegments={storyContent.segments.length}
          currentStep={currentStep}
          totalSteps={4}
        />
      </div>

      <div className="mb-2">
        <StoryProgress
          currentPoints={currentScore}
          maxPoints={maxScore}
        />
      </div>

      <h2 className="text-base font-bold mb-2">{currentSegmentData.title}</h2>
      
      {isSlide ? (
        <TheorySlide
          content={currentSegmentData.slides[slideIndex].content}
          onContinue={onContinue}
        />
      ) : (
        <StoryQuiz
          question={currentSegmentData.questions[questionIndex]}
          onCorrectAnswer={onCorrectAnswer}
          onWrongAnswer={onWrongAnswer}
        />
      )}
    </Card>
  );
};
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import TheorySlide from "./TheorySlide";
import StoryQuiz from "./StoryQuiz";
import SegmentProgress from "./SegmentProgress";
import StoryProgress from "./StoryProgress";
import { StoryContent, SegmentContent } from "@/hooks/useStoryContent";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";

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
  const { lectureId } = useParams();
  const currentSegmentData = storyContent.segments[currentSegment];
  const isSlide = currentStep < 2;
  const slideIndex = currentStep;
  const questionIndex = currentStep - 2;
  const maxScore = TOTAL_QUESTIONS_PER_SEGMENT * POINTS_PER_CORRECT_ANSWER;
  const currentScore = segmentScores[currentSegmentData.id] || 0;
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  const handleCorrectAnswer = async () => {
    setAnsweredQuestions(prev => new Set([...prev, questionIndex]));
    onCorrectAnswer();
    
    // Save progress to database
    if (lectureId) {
      try {
        const segmentNumber = parseInt(currentSegmentData.id.split('_')[1]);
        const { error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            lecture_id: parseInt(lectureId),
            segment_number: segmentNumber,
            score: currentScore + POINTS_PER_CORRECT_ANSWER,
            completed_at: new Date().toISOString()
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    }
  };

  const handleWrongAnswer = () => {
    setAnsweredQuestions(prev => new Set([...prev, questionIndex]));
    onWrongAnswer();
  };

  // Loading state
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

  // Check if we have the required slide or question for the current step
  if (isSlide && !currentSegmentData.slides[slideIndex]) {
    return (
      <Card className="p-2">
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-muted-foreground">
            Slide content not found.
          </p>
        </div>
      </Card>
    );
  }

  if (!isSlide && !currentSegmentData.questions[questionIndex]) {
    return (
      <Card className="p-2">
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-muted-foreground">
            Question content not found.
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
          onCorrectAnswer={handleCorrectAnswer}
          onWrongAnswer={handleWrongAnswer}
          isAnswered={answeredQuestions.has(questionIndex)}
        />
      )}
    </Card>
  );
};
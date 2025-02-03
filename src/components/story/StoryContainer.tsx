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
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const handleContinue = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onContinue();
  };

  const handleCorrectAnswer = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        toast({
          title: "Authentication Error",
          description: "Please make sure you're logged in to save progress.",
          variant: "destructive",
        });
        return;
      }

      // Check if this question was already answered correctly
      if (answeredQuestions.has(questionIndex)) {
        console.log('Question already answered correctly');
        handleContinue();
        return;
      }

      setAnsweredQuestions(prev => new Set([...prev, questionIndex]));
      
      if (lectureId) {
        const segmentNumber = parseInt(currentSegmentData.id.split('_')[1]);
        
        // Get the most recent progress entry
        const { data: currentProgress, error: progressError } = await supabase
          .from('user_progress')
          .select('score')
          .eq('user_id', user.id)
          .eq('lecture_id', parseInt(lectureId))
          .eq('segment_number', segmentNumber)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (progressError) {
          console.error('Error fetching current progress:', progressError);
          return;
        }

        const currentScore = currentProgress?.score || 0;
        const newScore = currentScore + POINTS_PER_CORRECT_ANSWER;
        
        const { error: updateError } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            lecture_id: parseInt(lectureId),
            segment_number: segmentNumber,
            score: newScore,
            completed_at: newScore >= maxScore ? new Date().toISOString() : null
          });

        if (updateError) {
          console.error('Error saving progress:', updateError);
          toast({
            title: "Error",
            description: "Failed to save progress. Please try again.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "🎯 Correct!",
          description: `+${POINTS_PER_CORRECT_ANSWER} points earned! Total: ${newScore}/${maxScore} XP`,
        });

        // Only proceed to next step if we haven't reached max score yet
        if (newScore < maxScore) {
          handleContinue();
        } else {
          // If we've reached max score, call onCorrectAnswer to trigger segment completion
          onCorrectAnswer();
          toast({
            title: "🌟 Segment Complete!",
            description: "Great job! Moving to the next segment.",
          });
        }
      }
    } catch (error) {
      console.error('Error in handleCorrectAnswer:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWrongAnswer = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAnsweredQuestions(prev => new Set([...prev, questionIndex]));
    onWrongAnswer();
    toast({
      title: "Keep trying!",
      description: "Don't worry, mistakes help us learn.",
      variant: "destructive"
    });
  };

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
          currentPoints={segmentScores[currentSegmentData.id] || 0}
          maxPoints={maxScore}
        />
      </div>

      <h2 className="text-base font-bold mb-2">{currentSegmentData.title}</h2>
      
      {isSlide ? (
        <TheorySlide
          content={currentSegmentData.slides[slideIndex].content}
          onContinue={handleContinue}
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
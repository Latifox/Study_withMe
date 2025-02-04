import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import TheorySlide from "./TheorySlide";
import StoryQuiz from "./StoryQuiz";
import SegmentProgress from "./SegmentProgress";
import StoryProgress from "./StoryProgress";
import StoryFailDialog from "./StoryFailDialog";
import StoryCompletionScreen from "./StoryCompletionScreen";
import { handleQuizProgress } from "./QuizProgressHandler";
import { POINTS_PER_CORRECT_ANSWER, MAX_SCORE } from "@/utils/scoreUtils";
import { supabase } from "@/integrations/supabase/client";

interface StoryContainerProps {
  storyContent: {
    segments: Array<{
      id: string;
      title: string;
      slides?: any;
      questions?: any;
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
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [showFailDialog, setShowFailDialog] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [currentScore, setCurrentScore] = useState(segmentScores[currentSegmentData?.id] || 0);
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

      if (!lectureId) return;
      const segmentNumber = parseInt(currentSegmentData.id.split('_')[1]);
      const quizNumber = questionIndex + 1;

      await handleQuizProgress({
        userId: user.id,
        lectureId: parseInt(lectureId),
        segmentNumber,
        quizNumber,
        isCorrect: true,
        onSuccess: (newScore) => {
          // Immediately update the local score state
          setCurrentScore(newScore);
          
          toast({
            title: "🎯 Correct!",
            description: `+5 points earned! Total: ${newScore}/10 XP`,
          });

          if (quizNumber === 2) {
            if (newScore >= 10) {
              setShowCompletionScreen(true);
              onCorrectAnswer();
              toast({
                title: "🌟 Node Complete!",
                description: "Great job! You've mastered this node.",
              });
            } else {
              setShowFailDialog(true);
            }
          } else {
            handleContinue();
          }
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to save progress. Please try again.",
            variant: "destructive",
          });
        }
      });

    } catch (error) {
      console.error('Error in handleCorrectAnswer:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWrongAnswer = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        return;
      }

      if (!lectureId) return;
      const segmentNumber = parseInt(currentSegmentData.id.split('_')[1]);
      const quizNumber = questionIndex + 1;

      await handleQuizProgress({
        userId: user.id,
        lectureId: parseInt(lectureId),
        segmentNumber,
        quizNumber,
        isCorrect: false,
        onSuccess: (newScore) => {
          // Update the local score state
          setCurrentScore(newScore);
          
          if (quizNumber === 2 && newScore < 10) {
            setShowFailDialog(true);
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setAnsweredQuestions(prev => new Set([...prev, questionIndex]));
            onWrongAnswer();
            toast({
              title: "Keep trying!",
              description: "Don't worry, mistakes help us learn.",
              variant: "destructive"
            });
            handleContinue();
          }
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to save progress. Please try again.",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error('Error in handleWrongAnswer:', error);
    }
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

  if (showCompletionScreen) {
    return <StoryCompletionScreen onBack={() => window.history.back()} />;
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
          maxPoints={MAX_SCORE}
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

      <StoryFailDialog
        isOpen={showFailDialog}
        onClose={() => setShowFailDialog(false)}
        onRestart={() => window.location.reload()}
        courseId={courseId || ""}
        score={currentScore}
      />
    </Card>
  );
};

export default StoryContainer;
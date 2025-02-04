
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { handleQuizProgress } from "../QuizProgressHandler";
import StoryQuiz from "../StoryQuiz";
import StoryFailDialog from "../StoryFailDialog";
import { MAX_SCORE } from "@/utils/scoreUtils";

interface QuizHandlerProps {
  currentSegmentData: {
    id: string;
    questions: any[];
  };
  questionIndex: number;
  lectureId: string | undefined;
  courseId: string | undefined;
  currentScore: number;
  onCorrectAnswer: () => void;
  onWrongAnswer: () => void;
  onContinue: () => void;
}

const QuizHandler = ({
  currentSegmentData,
  questionIndex,
  lectureId,
  courseId,
  currentScore,
  onCorrectAnswer,
  onWrongAnswer,
  onContinue
}: QuizHandlerProps) => {
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [showFailDialog, setShowFailDialog] = useState(false);
  const { toast } = useToast();

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
          toast({
            title: "🎯 Correct!",
            description: `+5 points earned! Total: ${newScore}/10 XP`,
          });

          if (quizNumber === 2) {
            if (newScore >= 10) {
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
          if (quizNumber === 2 && newScore < 10) {
            setShowFailDialog(true);
          } else {
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

  const handleContinue = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onContinue();
  };

  return (
    <>
      <StoryQuiz
        question={currentSegmentData.questions[questionIndex]}
        onCorrectAnswer={handleCorrectAnswer}
        onWrongAnswer={handleWrongAnswer}
        isAnswered={answeredQuestions.has(questionIndex)}
      />

      <StoryFailDialog
        isOpen={showFailDialog}
        onClose={() => setShowFailDialog(false)}
        onRestart={() => window.location.reload()}
        courseId={courseId || ""}
        score={currentScore}
      />
    </>
  );
};

export default QuizHandler;

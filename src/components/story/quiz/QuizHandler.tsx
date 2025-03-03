
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  const [failedQuestions, setFailedQuestions] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  console.log('QuizHandler - Current segment data:', currentSegmentData);
  console.log('QuizHandler - Question index:', questionIndex, 'Current score:', currentScore);

  const handleCorrectAnswer = async () => {
    console.log('QuizHandler - Correct answer selected');
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

      if (!lectureId) {
        console.error('Missing lecture ID');
        return;
      }
      
      // Parse segment number from the ID
      const segmentId = currentSegmentData.id;
      console.log('Segment ID for parsing:', segmentId);
      
      // Try different parsing methods depending on the format
      let segmentNumber: number;
      if (segmentId.includes('_')) {
        segmentNumber = parseInt(segmentId.split('_')[1]);
      } else if (!isNaN(parseInt(segmentId))) {
        segmentNumber = parseInt(segmentId);
      } else {
        console.error('Invalid segment ID format:', segmentId);
        toast({
          title: "Error",
          description: "Invalid segment format. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Parsed segment number:', segmentNumber);
      const quizNumber = questionIndex + 1;

      // Mark question as answered
      setAnsweredQuestions(prev => new Set([...prev, questionIndex]));

      // Remove from failed questions if it was there
      if (failedQuestions.has(questionIndex)) {
        const updatedFailedQuestions = new Set(failedQuestions);
        updatedFailedQuestions.delete(questionIndex);
        setFailedQuestions(updatedFailedQuestions);
      }

      if (quizNumber === 2) {
        // Check if there are any failed questions that need to be retaken
        if (failedQuestions.size > 0) {
          setShowFailDialog(true);
        } else {
          toast({
            title: "🌟 Node Complete!",
            description: "Great job! You've mastered this node.",
          });
          onCorrectAnswer();
        }
      } else {
        onCorrectAnswer();
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

  const handleWrongAnswer = async () => {
    console.log('QuizHandler - Wrong answer selected');
    try {
      // Add to failed questions set
      setFailedQuestions(prev => new Set([...prev, questionIndex]));
      setAnsweredQuestions(prev => new Set([...prev, questionIndex]));
      
      // Call parent handler for wrong answer (will reset to first slide)
      onWrongAnswer();
      
    } catch (error) {
      console.error('Error in handleWrongAnswer:', error);
    }
  };

  const handleContinue = () => {
    console.log('QuizHandler - Continue button clicked');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onContinue();
  };

  const handleRetakeFailedQuestions = () => {
    setShowFailDialog(false);
    // Logic to go back to the first failed question will be handled by parent component
    onWrongAnswer();
  };

  return (
    <>
      <StoryQuiz
        question={currentSegmentData.questions[0]}
        onCorrectAnswer={handleCorrectAnswer}
        onWrongAnswer={handleWrongAnswer}
        isAnswered={answeredQuestions.has(questionIndex)}
      />

      <StoryFailDialog
        isOpen={showFailDialog}
        onClose={() => setShowFailDialog(false)}
        onRestart={handleRetakeFailedQuestions}
        courseId={courseId || ""}
        score={currentScore}
        hasFailedQuestions={failedQuestions.size > 0}
      />
    </>
  );
};

export default QuizHandler;

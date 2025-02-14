
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { updateUserProgress } from "@/services/quizProgressService";

interface StoryContentHandlerProps {
  nodeId: string | undefined;
  numericLectureId: number | null;
  sequenceNumber: number | null;
  currentStep: number;
  segmentScores: { [key: string]: number };
  setSegmentScores: (scores: { [key: string]: number } | ((prev: { [key: string]: number }) => { [key: string]: number })) => void;
  setCurrentStep: (step: number | ((prev: number) => number)) => void;
}

export const useStoryContentHandler = ({
  nodeId,
  numericLectureId,
  sequenceNumber,
  currentStep,
  segmentScores,
  setSegmentScores,
  setCurrentStep
}: StoryContentHandlerProps) => {
  const [failedQuestions, setFailedQuestions] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const handleContinue = () => {
    setCurrentStep(prev => {
      const newStep = prev + 1;
      if (newStep === 4) {
        const totalScore = segmentScores[nodeId || ''] || 0;
        console.log('Current score:', totalScore, 'Failed questions:', failedQuestions);
        // If we reach this point, the user has answered all questions correctly
        // since wrong answers restart the segment
        toast({
          title: "🎉 Node Completed!",
          description: "Great job! You've mastered this node.",
        });
      }
      return newStep;
    });
  };

  const handleCorrectAnswer = async () => {
    if (!nodeId || !numericLectureId || !sequenceNumber) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentQuestionIndex = currentStep - 2;
    
    // Remove from failed questions if it was there
    const updatedFailedQuestions = new Set(failedQuestions);
    updatedFailedQuestions.delete(currentQuestionIndex);
    setFailedQuestions(updatedFailedQuestions);

    const newScore = (segmentScores[nodeId] || 0) + 5;
    setSegmentScores(prev => ({
      ...prev,
      [nodeId]: newScore
    }));

    try {
      // Always update progress since we know this is a correct answer
      if (currentStep === 3) {
        await updateUserProgress(user.id, numericLectureId, sequenceNumber, newScore);
      }

      toast({
        title: "🌟 Correct Answer!",
        description: `+5 XP points earned! Total: ${newScore}/10 XP`,
      });
      handleContinue();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWrongAnswer = async () => {
    if (!nodeId || !numericLectureId || !sequenceNumber) return;
    
    const currentQuestionIndex = currentStep - 2;
    setFailedQuestions(prev => new Set([...prev, currentQuestionIndex]));

    // Reset the score in state
    setSegmentScores(prev => ({ ...prev, [nodeId]: 0 }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Call the database function to delete all progress for this segment
        const { error } = await supabase
          .rpc('delete_segment_progress', {
            p_user_id: user.id,
            p_lecture_id: numericLectureId,
            p_segment_number: sequenceNumber
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error deleting segment progress:', error);
    }
    
    toast({
      title: "Let's review!",
      description: "Let's go back to the theory slides to better understand the material.",
      variant: "destructive"
    });
    
    // Ensure immediate reset to step 0 (first theory slide)
    setTimeout(() => {
      setCurrentStep(0);
    }, 0);
  };

  return {
    handleContinue,
    handleCorrectAnswer,
    handleWrongAnswer
  };
};

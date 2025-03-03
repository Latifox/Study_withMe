
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { POINTS_PER_CORRECT_ANSWER } from "@/utils/scoreUtils";

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
    console.log('Continuing to next step, current step:', currentStep);
    setCurrentStep(prev => {
      const newStep = prev + 1;
      console.log('New step will be:', newStep);
      if (newStep === 4) {
        const totalScore = segmentScores[nodeId || ''] || 0;
        console.log('Current score on completion:', totalScore, 'Failed questions:', failedQuestions);
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
    console.log('Handling correct answer. NodeId:', nodeId, 'LectureId:', numericLectureId, 'SequenceNumber:', sequenceNumber);
    
    if (!nodeId || !numericLectureId || sequenceNumber === null) {
      console.error('Missing required data for saving progress:', { nodeId, numericLectureId, sequenceNumber });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return;
    }

    const currentQuestionIndex = currentStep - 2;
    const quizNumber = currentQuestionIndex + 1;
    
    console.log('Current question index:', currentQuestionIndex, 'Quiz number:', quizNumber);
    
    // Remove from failed questions if it was there
    const updatedFailedQuestions = new Set(failedQuestions);
    updatedFailedQuestions.delete(currentQuestionIndex);
    setFailedQuestions(updatedFailedQuestions);

    const newScore = (segmentScores[nodeId] || 0) + POINTS_PER_CORRECT_ANSWER;
    setSegmentScores(prev => ({
      ...prev,
      [nodeId]: newScore
    }));

    try {
      // Insert the quiz progress record
      const { error } = await supabase
        .from('quiz_progress')
        .upsert({
          user_id: user.id,
          lecture_id: numericLectureId,
          segment_number: sequenceNumber,
          quiz_number: quizNumber,
          quiz_score: POINTS_PER_CORRECT_ANSWER,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,lecture_id,segment_number,quiz_number'
        });

      if (error) {
        console.error('Error saving quiz progress:', error);
        throw error;
      }

      console.log('Quiz progress saved successfully. New score:', newScore);
      toast({
        title: "🌟 Correct Answer!",
        description: `+${POINTS_PER_CORRECT_ANSWER} XP points earned! Total: ${newScore}/10 XP`,
      });
      
      // Wait a moment before continuing to next step to allow toast to be seen
      setTimeout(() => {
        handleContinue();
      }, 500);
    } catch (error) {
      console.error('Error saving quiz progress:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWrongAnswer = async () => {
    console.log('Handling wrong answer. NodeId:', nodeId, 'LectureId:', numericLectureId, 'SequenceNumber:', sequenceNumber);
    
    if (!nodeId || !numericLectureId || sequenceNumber === null) {
      console.error('Missing required data for handling wrong answer');
      return;
    }
    
    const currentQuestionIndex = currentStep - 2;
    console.log('Current question index that was answered incorrectly:', currentQuestionIndex);
    
    setFailedQuestions(prev => new Set([...prev, currentQuestionIndex]));

    // Reset the score in state
    setSegmentScores(prev => ({ ...prev, [nodeId]: 0 }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('Deleting segment progress for user:', user.id, 'lecture:', numericLectureId, 'segment:', sequenceNumber);
        // Call the database function to delete all progress for this segment
        const { error } = await supabase
          .rpc('delete_segment_progress', {
            p_user_id: user.id,
            p_lecture_id: numericLectureId,
            p_segment_number: sequenceNumber
          });

        if (error) {
          console.error('Error deleting segment progress:', error);
          throw error;
        }
        console.log('Segment progress deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting segment progress:', error);
    }
    
    toast({
      title: "Let's review!",
      description: "Let's go back to the theory slides to better understand the material.",
      variant: "destructive"
    });
    
    // Reset to step 0 (first theory slide)
    console.log('Resetting to first theory slide (step 0)');
    setCurrentStep(0);
  };

  return {
    handleContinue,
    handleCorrectAnswer,
    handleWrongAnswer
  };
};

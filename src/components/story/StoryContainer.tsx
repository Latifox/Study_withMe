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

const POINTS_PER_CORRECT_ANSWER = 5;
const TOTAL_QUESTIONS_PER_SEGMENT = 2;
const MAX_SCORE = POINTS_PER_CORRECT_ANSWER * TOTAL_QUESTIONS_PER_SEGMENT;

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

      if (!lectureId) return;
      const segmentNumber = parseInt(currentSegmentData.id.split('_')[1]);
      const quizNumber = questionIndex + 1;

      console.log('Recording quiz completion:', { segmentNumber, quizNumber });

      // Record the quiz completion
      const { error: quizProgressError } = await supabase
        .from('quiz_progress')
        .upsert({
          user_id: user.id,
          lecture_id: parseInt(lectureId),
          segment_number: segmentNumber,
          quiz_number: quizNumber,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id, lecture_id, segment_number, quiz_number'
        });

      if (quizProgressError) {
        console.error('Error saving quiz progress:', quizProgressError);
        toast({
          title: "Error",
          description: "Failed to save quiz progress. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Update overall segment progress with new score
      const currentScore = segmentScores[currentSegmentData.id] || 0;
      const newScore = currentScore + POINTS_PER_CORRECT_ANSWER;

      const { error: progressError } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          lecture_id: parseInt(lectureId),
          segment_number: segmentNumber,
          score: newScore,
          completed_at: newScore >= MAX_SCORE ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id, lecture_id, segment_number'
        });

      if (progressError) {
        console.error('Error saving progress:', progressError);
        toast({
          title: "Error",
          description: "Failed to save progress. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Show success toast for current quiz
      toast({
        title: "🎯 Correct!",
        description: `+${POINTS_PER_CORRECT_ANSWER} points earned! Total: ${newScore}/${MAX_SCORE} XP`,
      });

      // If this is the second quiz, check total score
      if (quizNumber === TOTAL_QUESTIONS_PER_SEGMENT) {
        if (newScore >= MAX_SCORE) {
          // Both quizzes correct, complete the segment
          onCorrectAnswer();
          toast({
            title: "🌟 Segment Complete!",
            description: "Great job! You've mastered this node.",
          });
        } else {
          // Not enough points, reset progress
          await supabase
            .from('quiz_progress')
            .delete()
            .eq('user_id', user.id)
            .eq('lecture_id', parseInt(lectureId))
            .eq('segment_number', segmentNumber);

          await supabase
            .from('user_progress')
            .upsert({
              user_id: user.id,
              lecture_id: parseInt(lectureId),
              segment_number: segmentNumber,
              score: 0,
              completed_at: null,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id, lecture_id, segment_number'
            });

          toast({
            title: "Keep practicing!",
            description: "You need to get both questions correct to advance. Let's try again!",
            variant: "destructive",
          });
          
          // Reset to beginning of segment
          window.location.reload();
        }
      } else {
        // First quiz correct, continue to second quiz
        handleContinue();
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
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        return;
      }

      if (!lectureId) return;
      const segmentNumber = parseInt(currentSegmentData.id.split('_')[1]);
      const quizNumber = questionIndex + 1;

      // Record the failed quiz attempt
      await supabase
        .from('quiz_progress')
        .upsert({
          user_id: user.id,
          lecture_id: parseInt(lectureId),
          segment_number: segmentNumber,
          quiz_number: quizNumber,
          completed_at: null
        }, {
          onConflict: 'user_id, lecture_id, segment_number, quiz_number'
        });

      // If this is the second quiz and first quiz was correct, reset progress
      if (quizNumber === TOTAL_QUESTIONS_PER_SEGMENT) {
        await supabase
          .from('quiz_progress')
          .delete()
          .eq('user_id', user.id)
          .eq('lecture_id', parseInt(lectureId))
          .eq('segment_number', segmentNumber);

        await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            lecture_id: parseInt(lectureId),
            segment_number: segmentNumber,
            score: 0,
            completed_at: null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id, lecture_id, segment_number'
          });

        toast({
          title: "Keep practicing!",
          description: "You need to get both questions correct to advance. Let's try again!",
          variant: "destructive",
        });
        
        // Reset to beginning of segment
        window.location.reload();
      } else {
        // First quiz wrong, continue to second quiz
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
    </Card>
  );
};
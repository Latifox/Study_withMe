import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StoryLoading from "@/components/story/StoryLoading";
import StoryError from "@/components/story/StoryError";
import StoryScoreHeader from "@/components/story/StoryScoreHeader";
import StoryCompletionScreen from "@/components/story/StoryCompletionScreen";
import StoryMainContent from "@/components/story/StoryMainContent";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  type: "multiple_choice" | "true_false";
  question: string;
  options?: string[];
  correctAnswer: string | boolean;
  explanation: string;
}

const StoryContent = () => {
  const { courseId, lectureId, nodeId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [segmentScores, setSegmentScores] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

  const segmentNumber = nodeId ? parseInt(nodeId.split('_')[1]) : null;
  const numericLectureId = lectureId ? parseInt(lectureId) : null;

  useEffect(() => {
    const fetchExistingProgress = async () => {
      if (!segmentNumber || !numericLectureId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: progress } = await supabase
        .from('user_progress')
        .select('score')
        .eq('segment_number', segmentNumber)
        .eq('lecture_id', numericLectureId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (progress) {
        setSegmentScores(prev => ({
          ...prev,
          [nodeId || '']: progress.score || 0
        }));
      }
    };

    fetchExistingProgress();
  }, [nodeId, numericLectureId, segmentNumber]);

  const isValidQuizQuestion = (question: any): question is QuizQuestion => {
    return (
      question &&
      typeof question === 'object' &&
      (question.type === 'multiple_choice' || question.type === 'true_false') &&
      typeof question.question === 'string' &&
      (typeof question.correctAnswer === 'string' || typeof question.correctAnswer === 'boolean') &&
      typeof question.explanation === 'string' &&
      (!question.options || Array.isArray(question.options))
    );
  };

  const { data: content, isLoading, error } = useQuery({
    queryKey: ['segment-content', numericLectureId, nodeId],
    queryFn: async () => {
      if (!numericLectureId || !nodeId) throw new Error('Lecture ID and Node ID are required');
      console.log('Fetching content for:', { lectureId: numericLectureId, nodeId });

      const segmentNumber = parseInt(nodeId.split('_')[1]);
      if (isNaN(segmentNumber)) throw new Error('Invalid segment number');

      // First, get the story structure
      const { data: storyStructure, error: structureError } = await supabase
        .from('story_structures')
        .select('*, segment_contents(*)')
        .eq('lecture_id', numericLectureId)
        .single();

      if (structureError) throw structureError;
      if (!storyStructure) throw new Error('Story structure not found');

      // Find the segment content
      const segmentContent = storyStructure.segment_contents?.find(
        content => content.segment_number === segmentNumber
      );

      if (!segmentContent) {
        console.log('No content found, triggering generation...');
        const { data: generatedContent, error: generationError } = await supabase.functions.invoke('generate-segment-content', {
          body: {
            lectureId: numericLectureId,
            segmentNumber,
            segmentTitle: storyStructure[`segment_${segmentNumber}_title`]
          }
        });

        if (generationError) throw generationError;

        const quiz1 = generatedContent.segmentContent.quiz_question_1 as unknown as QuizQuestion;
        const quiz2 = generatedContent.segmentContent.quiz_question_2 as unknown as QuizQuestion;

        if (!isValidQuizQuestion(quiz1) || !isValidQuizQuestion(quiz2)) {
          throw new Error('Invalid quiz question format received from generation');
        }
        
        return {
          segments: [{
            id: nodeId,
            title: storyStructure[`segment_${segmentNumber}_title`] || `Segment ${segmentNumber}`,
            slides: [
              { id: 'slide-1', content: generatedContent.segmentContent.theory_slide_1 },
              { id: 'slide-2', content: generatedContent.segmentContent.theory_slide_2 }
            ],
            questions: [
              { id: 'q1', ...quiz1 },
              { id: 'q2', ...quiz2 }
            ]
          }]
        };
      }

      const quiz1 = segmentContent.quiz_question_1 as unknown as QuizQuestion;
      const quiz2 = segmentContent.quiz_question_2 as unknown as QuizQuestion;

      if (!isValidQuizQuestion(quiz1) || !isValidQuizQuestion(quiz2)) {
        throw new Error('Invalid quiz question format in database');
      }

      return {
        segments: [{
          id: nodeId,
          title: storyStructure[`segment_${segmentNumber}_title`] || `Segment ${segmentNumber}`,
          slides: [
            { id: 'slide-1', content: segmentContent.theory_slide_1 },
            { id: 'slide-2', content: segmentContent.theory_slide_2 }
          ],
          questions: [
            { id: 'q1', ...quiz1 },
            { id: 'q2', ...quiz2 }
          ]
        }]
      };
    },
    enabled: Boolean(numericLectureId && nodeId),
    retry: 1
  });

  const handleBack = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/story/nodes`);
  };

  const handleContinue = () => {
    setCurrentStep(prev => {
      const newStep = prev + 1;
      if (newStep === 4) {
        const totalScore = segmentScores[nodeId || ''] || 0;
        if (totalScore < 10) {
          toast({
            title: "Not enough points!",
            description: `You need 10 XP to complete this node. Current: ${totalScore} XP. Try again!`,
            variant: "destructive",
          });
          // Reset progress for this node
          setSegmentScores(prev => ({ ...prev, [nodeId || '']: 0 }));
          return 0; // Reset to beginning
        } else {
          toast({
            title: "🎉 Node Completed!",
            description: "Great job! You've mastered this node.",
          });
        }
      }
      return newStep;
    });
  };

  const handleCorrectAnswer = async () => {
    if (!nodeId || !numericLectureId || !segmentNumber) return;

    const newScore = (segmentScores[nodeId] || 0) + 5;
    setSegmentScores(prev => ({
      ...prev,
      [nodeId]: newScore
    }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update progress in database
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        lecture_id: numericLectureId,
        segment_number: segmentNumber,
        score: newScore,
        completed_at: newScore >= 10 ? new Date().toISOString() : null
      });

    if (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "🌟 Correct Answer!",
      description: `+5 XP points earned! Total: ${newScore}/10 XP`,
    });
    handleContinue();
  };

  const handleWrongAnswer = () => {
    toast({
      title: "Keep trying!",
      description: "Don't worry, mistakes help us learn.",
      variant: "destructive"
    });
    handleContinue();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-2">
        <StoryLoading />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="container mx-auto p-2">
        <StoryError 
          message={error instanceof Error ? error.message : "Failed to load segment content"}
          onBack={handleBack}
        />
      </div>
    );
  }

  const currentScore = segmentScores[nodeId || ''] || 0;

  if (currentStep >= 4 && currentScore >= 10) {
    return <StoryCompletionScreen onBack={handleBack} />;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <StoryScoreHeader
        currentScore={currentScore}
        currentStep={currentStep}
        onBack={handleBack}
      />
      <StoryMainContent
        content={content}
        currentStep={currentStep}
        segmentScores={segmentScores}
        onContinue={handleContinue}
        onCorrectAnswer={handleCorrectAnswer}
        onWrongAnswer={handleWrongAnswer}
      />
    </div>
  );
};

export default StoryContent;

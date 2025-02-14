import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import StoryCompletionScreen from "@/components/story/StoryCompletionScreen";
import StoryLoading from "@/components/story/StoryLoading";
import StoryError from "@/components/story/StoryError";
import StoryScoreHeader from "@/components/story/StoryScoreHeader";
import StoryMainContent from "@/components/story/StoryMainContent";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SegmentContent {
  content: {
    theory_slide_1: string;
    theory_slide_2: string;
    quiz_question_1: {
      type: "multiple_choice";
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    };
    quiz_question_2: {
      type: "true_false";
      question: string;
      correctAnswer: boolean;
      explanation: string;
    };
  };
}

const StoryContent = () => {
  const { courseId, lectureId, nodeId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [segmentScores, setSegmentScores] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

  const sequenceNumber = nodeId ? parseInt(nodeId.split('_')[1]) : null;
  const numericLectureId = lectureId ? parseInt(lectureId) : null;

  // Reset score when starting/restarting a node
  useEffect(() => {
    if (nodeId) {
      setSegmentScores(prev => ({
        ...prev,
        [nodeId]: 0
      }));
    }
  }, [nodeId]);

  // Fetch existing progress
  useEffect(() => {
    const fetchExistingProgress = async () => {
      if (!sequenceNumber || !numericLectureId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: progress } = await supabase
        .from('user_progress')
        .select('score, completed_at')
        .eq('segment_number', sequenceNumber)
        .eq('lecture_id', numericLectureId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (progress?.completed_at) {
        setSegmentScores(prev => ({
          ...prev,
          [nodeId || '']: progress.score || 0
        }));
      }
    };

    fetchExistingProgress();
  }, [nodeId, numericLectureId, sequenceNumber]);

  const { data: content, isLoading, error } = useQuery({
    queryKey: ['segment-content', numericLectureId, sequenceNumber],
    queryFn: async () => {
      if (!numericLectureId || !sequenceNumber) throw new Error('Invalid parameters');

      console.log('Fetching content for lecture:', numericLectureId, 'sequence:', sequenceNumber);

      // Fetch segment info
      const { data: segment, error: segmentError } = await supabase
        .from('lecture_segments')
        .select('*')
        .eq('lecture_id', numericLectureId)
        .eq('sequence_number', sequenceNumber)
        .single();

      if (segmentError) {
        console.error('Error fetching segment:', segmentError);
        throw segmentError;
      }

      if (!segment) {
        console.error('No segment found');
        throw new Error('Segment not found');
      }

      // Fetch corresponding content
      const { data: segmentContent, error: contentError } = await supabase
        .from('segments_content')
        .select('theory_slide_1, theory_slide_2, quiz_1_type, quiz_1_question, quiz_1_options, quiz_1_correct_answer, quiz_1_explanation, quiz_2_type, quiz_2_question, quiz_2_correct_answer, quiz_2_explanation')
        .eq('lecture_id', numericLectureId)
        .eq('sequence_number', sequenceNumber)
        .single();

      if (contentError) {
        console.error('Error fetching content:', contentError);
        throw contentError;
      }

      return {
        segments: [{
          id: nodeId || '',
          title: segment.title,
          slides: [
            { id: 'slide-1', content: segmentContent.theory_slide_1 },
            { id: 'slide-2', content: segmentContent.theory_slide_2 }
          ],
          questions: [
            {
              type: segmentContent.quiz_1_type,
              question: segmentContent.quiz_1_question,
              options: segmentContent.quiz_1_options,
              correctAnswer: segmentContent.quiz_1_correct_answer,
              explanation: segmentContent.quiz_1_explanation
            },
            {
              type: segmentContent.quiz_2_type,
              question: segmentContent.quiz_2_question,
              correctAnswer: segmentContent.quiz_2_correct_answer,
              explanation: segmentContent.quiz_2_explanation
            }
          ].filter(Boolean)
        }]
      };
    }
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
    if (!nodeId || !numericLectureId || !sequenceNumber) return;

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
        segment_number: sequenceNumber,
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
      <div className="container mx-auto p-4">
        <StoryLoading />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="container mx-auto p-4">
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

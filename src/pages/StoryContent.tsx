import { useState } from "react";
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
    queryKey: ['segment-content', lectureId, nodeId],
    queryFn: async () => {
      if (!lectureId || !nodeId) throw new Error('Lecture ID and Node ID are required');
      console.log('Fetching content for:', { lectureId, nodeId });

      const segmentNumber = parseInt(nodeId.split('_')[1]);
      if (isNaN(segmentNumber)) throw new Error('Invalid segment number');

      // First, get the story structure
      const { data: storyStructure, error: structureError } = await supabase
        .from('story_structures')
        .select('*, segment_contents(*)')
        .eq('lecture_id', parseInt(lectureId))
        .single();

      if (structureError) {
        console.error('Error fetching story structure:', structureError);
        throw structureError;
      }
      if (!storyStructure) throw new Error('Story structure not found');

      // Find the segment content
      const segmentContent = storyStructure.segment_contents?.find(
        content => content.segment_number === segmentNumber
      );

      if (!segmentContent) {
        // If no content exists, trigger generation
        console.log('No content found, triggering generation...');
        const { data: generatedContent, error: generationError } = await supabase.functions.invoke('generate-segment-content', {
          body: {
            lectureId: parseInt(lectureId),
            segmentNumber,
            segmentTitle: storyStructure[`segment_${segmentNumber}_title`]
          }
        });

        if (generationError) throw generationError;

        // Validate and cast the quiz questions
        const quiz1 = generatedContent.segmentContent.quiz_question_1 as unknown as QuizQuestion;
        const quiz2 = generatedContent.segmentContent.quiz_question_2 as unknown as QuizQuestion;

        // Validate required fields
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

      // Validate and cast the existing quiz questions
      const quiz1 = segmentContent.quiz_question_1 as unknown as QuizQuestion;
      const quiz2 = segmentContent.quiz_question_2 as unknown as QuizQuestion;

      // Validate required fields
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
    retry: 1
  });

  const handleBack = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/story/nodes`);
  };

  const handleContinue = () => {
    setCurrentStep(prev => {
      const newStep = prev + 1;
      if (newStep === 4) {
        toast({
          title: "🎉 Segment Completed!",
          description: "Great job! You've completed this learning segment.",
        });
      }
      return newStep;
    });
  };

  const handleCorrectAnswer = () => {
    if (!nodeId) return;
    setSegmentScores(prev => ({
      ...prev,
      [nodeId]: (prev[nodeId] || 0) + 5
    }));
    toast({
      title: "🌟 Correct Answer!",
      description: "+5 XP points earned!",
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

  if (currentStep >= 4) {
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

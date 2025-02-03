import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useStoryContent } from "@/hooks/useStoryContent";
import { StoryContainer } from "@/components/story/StoryContainer";
import LearningPathway from "@/components/story/LearningPathway";
import StoryHeader from "@/components/story/StoryHeader";
import StoryLayout from "@/components/story/StoryLayout";
import StoryLoading from "@/components/story/StoryLoading";
import StoryError from "@/components/story/StoryError";
import { supabase } from "@/integrations/supabase/client";

const POINTS_PER_CORRECT_ANSWER = 5;
const TOTAL_QUESTIONS_PER_SEGMENT = 2;
const REQUIRED_SCORE_PERCENTAGE = 75;
const TOTAL_SEGMENTS = 10;
const TOTAL_QUESTIONS = TOTAL_SEGMENTS * TOTAL_QUESTIONS_PER_SEGMENT;
const MAX_POSSIBLE_SCORE = TOTAL_QUESTIONS * POINTS_PER_CORRECT_ANSWER;
const REQUIRED_POINTS = Math.ceil((REQUIRED_SCORE_PERCENTAGE / 100) * MAX_POSSIBLE_SCORE);

const Story = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentSegment, setCurrentSegment] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [segmentScores, setSegmentScores] = useState<{ [key: string]: number }>({});
  const [attemptedQuestions, setAttemptedQuestions] = useState<Set<string>>(new Set());
  const [completedNodes, setCompletedNodes] = useState(new Set<string>());
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  // Convert lectureId to number before passing to useStoryContent
  const numericLectureId = lectureId ? parseInt(lectureId, 10) : undefined;

  const { 
    data: storyContent, 
    isLoading: isLoadingStory,
    error: storyError,
  } = useStoryContent(numericLectureId?.toString());

  const generateSegmentContent = async (segmentNumber: number, segmentTitle: string) => {
    try {
      setIsGeneratingContent(true);
      
      const { data: lecture } = await supabase
        .from('lectures')
        .select('content')
        .eq('id', numericLectureId)
        .single();

      if (!lecture?.content) {
        throw new Error('Lecture content not found');
      }

      toast({
        title: "Generating Content",
        description: "Please wait while we prepare the content for this segment...",
      });

      const { data, error } = await supabase.functions.invoke('generate-segment-content', {
        body: {
          lectureId: numericLectureId,
          segmentNumber,
          segmentTitle,
          lectureContent: lecture.content
        },
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ 
        queryKey: ['story-content', numericLectureId?.toString()] 
      });

      toast({
        title: "Content Ready",
        description: "The segment content has been generated successfully.",
      });

      return data;
    } catch (error) {
      console.error('Error generating segment content:', error);
      toast({
        title: "Error",
        description: "Failed to generate segment content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleNodeSelect = async (nodeId: string) => {
    if (!storyContent?.segments) return;
    
    const index = storyContent.segments.findIndex(s => s.id === nodeId);
    if (index === -1) return;

    const segment = storyContent.segments[index];
    
    if (!segment.slides || !segment.questions) {
      await generateSegmentContent(index, segment.title);
    }

    setCurrentSegment(index);
    setCurrentStep(0);
  };

  const handleBack = () => {
    navigate(`/course/${courseId}`);
  };

  const checkCompletion = () => {
    const currentTotalScore = Object.values(segmentScores).reduce((sum, score) => sum + score, 0);
    setTotalScore(currentTotalScore);

    if (currentTotalScore < REQUIRED_POINTS) {
      toast({
        title: "Story Incomplete",
        description: `You need at least ${REQUIRED_POINTS} points to complete the story. Your current score is ${currentTotalScore}. Please try again.`,
        variant: "destructive",
      });
      // Reset progress
      setCurrentSegment(0);
      setCurrentStep(0);
      setSegmentScores({});
      setAttemptedQuestions(new Set());
      setCompletedNodes(new Set());
    } else {
      toast({
        title: "Congratulations!",
        description: `You've completed the story with ${currentTotalScore} points!`,
      });
      navigate(`/course/${courseId}`);
    }
  };

  const handleContinue = () => {
    if (!storyContent?.segments) return;

    const totalSteps = 4; // 2 slides + 2 questions
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      const currentSegmentData = storyContent.segments[currentSegment];
      setCompletedNodes(prev => new Set([...prev, currentSegmentData.id]));
      
      if (currentSegment < storyContent.segments.length - 1) {
        setCurrentSegment(prev => prev + 1);
        setCurrentStep(0);
      } else {
        checkCompletion();
      }
    }
  };

  const handleCorrectAnswer = () => {
    if (!storyContent?.segments) return;
    
    const currentSegmentData = storyContent.segments[currentSegment];
    const questionIndex = currentStep - 2;
    const questionId = currentSegmentData.questions?.[questionIndex]?.id;
    
    if (questionId && !attemptedQuestions.has(questionId)) {
      setSegmentScores(prev => ({
        ...prev,
        [currentSegmentData.id]: (prev[currentSegmentData.id] || 0) + POINTS_PER_CORRECT_ANSWER
      }));
      setAttemptedQuestions(prev => new Set([...prev, questionId]));
    }
    handleContinue();
  };

  const handleWrongAnswer = () => {
    if (!storyContent?.segments) return;
    
    const currentSegmentData = storyContent.segments[currentSegment];
    const questionIndex = currentStep - 2;
    const questionId = currentSegmentData.questions?.[questionIndex]?.id;
    
    if (questionId && !attemptedQuestions.has(questionId)) {
      setAttemptedQuestions(prev => new Set([...prev, questionId]));
    }
    handleContinue();
  };

  if (isLoadingStory || isGeneratingContent) {
    return (
      <div className="container mx-auto p-2">
        <StoryLoading />
      </div>
    );
  }

  if (storyError) {
    return (
      <div className="container mx-auto p-2">
        <StoryError 
          message={storyError instanceof Error ? storyError.message : "Failed to load story content"}
          onBack={handleBack}
        />
      </div>
    );
  }

  if (!storyContent?.segments?.length) {
    return (
      <div className="container mx-auto p-2">
        <StoryLoading />
      </div>
    );
  }

  const currentSegmentData = storyContent.segments[currentSegment];
  const pathwayNodes = storyContent.segments.map((segment, index) => ({
    id: segment.id,
    title: segment.title,
    type: "concept" as const,
    difficulty: "intermediate" as const,
    prerequisites: index > 0 ? [storyContent.segments[index - 1].id] : [],
    points: TOTAL_QUESTIONS_PER_SEGMENT * POINTS_PER_CORRECT_ANSWER,
    description: segment.description,
  }));

  return (
    <div className="container mx-auto p-2">
      <StoryHeader onBack={handleBack} />
      <StoryLayout
        pathwaySection={
          <LearningPathway
            nodes={pathwayNodes}
            completedNodes={completedNodes}
            currentNode={currentSegmentData.id}
            onNodeSelect={handleNodeSelect}
          />
        }
        contentSection={
          <StoryContainer
            storyContent={{
              segments: [{
                id: currentSegmentData.id,
                title: currentSegmentData.title,
                slides: currentSegmentData.slides,
                questions: currentSegmentData.questions
              }]
            }}
            currentSegment={0}
            currentStep={currentStep}
            segmentScores={segmentScores}
            onContinue={handleContinue}
            onCorrectAnswer={handleCorrectAnswer}
            onWrongAnswer={handleWrongAnswer}
          />
        }
      />
    </div>
  );
};

export default Story;
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TheorySlide from "@/components/story/TheorySlide";
import StoryQuiz from "@/components/story/StoryQuiz";
import SegmentProgress from "@/components/story/SegmentProgress";
import LearningPathway from "@/components/story/LearningPathway";
import StoryProgress from "@/components/story/StoryProgress";

interface Slide {
  id: string;
  content: string;
}

interface Question {
  id: string;
  type: "multiple_choice" | "true_false";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface Segment {
  id: string;
  title: string;
  slides: Slide[];
  questions: Question[];
}

interface StoryContent {
  segments: Segment[];
}

const POINTS_PER_CORRECT_ANSWER = 5;
const REQUIRED_SCORE_PERCENTAGE = 75;
const TOTAL_QUESTIONS_PER_SEGMENT = 2;

const Story = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentSegment, setCurrentSegment] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [segmentScores, setSegmentScores] = useState<{ [key: string]: number }>({});
  const [attemptedQuestions, setAttemptedQuestions] = useState<Set<string>>(new Set());
  const [completedNodes, setCompletedNodes] = useState(new Set<string>());

  const { data: storyContent, isLoading, error } = useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      // First, try to get existing story content
      const { data: existingContent } = await supabase
        .from('story_contents')
        .select('content')
        .eq('lecture_id', lectureId)
        .single();

      if (existingContent) {
        return existingContent.content as StoryContent;
      }

      // If no existing content, generate new content
      const { data: generatedContent, error } = await supabase.functions.invoke('generate-story-content', {
        body: { lectureId }
      });

      if (error) throw error;
      if (!generatedContent?.storyContent?.segments?.length) {
        throw new Error('Invalid story content structure');
      }

      // Store the generated content
      const { error: insertError } = await supabase
        .from('story_contents')
        .insert({
          lecture_id: lectureId,
          content: generatedContent.storyContent
        });

      if (insertError) throw insertError;

      return generatedContent.storyContent as StoryContent;
    },
    staleTime: Infinity, // Content won't become stale
    cacheTime: 1000 * 60 * 60, // Cache for 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  const handleContinue = () => {
    if (!storyContent?.segments) return;

    const totalSteps = 4; // 2 slides + 2 questions
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      const currentSegmentData = storyContent.segments[currentSegment];
      const segmentScore = segmentScores[currentSegmentData.id] || 0;
      const maxPossibleScore = TOTAL_QUESTIONS_PER_SEGMENT * POINTS_PER_CORRECT_ANSWER;
      const scorePercentage = (segmentScore / maxPossibleScore) * 100;

      if (scorePercentage >= REQUIRED_SCORE_PERCENTAGE) {
        setCompletedNodes(prev => new Set([...prev, currentSegmentData.id]));
        if (currentSegment < storyContent.segments.length - 1) {
          setCurrentSegment(prev => prev + 1);
          setCurrentStep(0);
          toast({
            title: "Segment Completed!",
            description: `You've completed this segment with ${scorePercentage}% score.`,
          });
        } else {
          toast({
            title: "Congratulations!",
            description: "You've completed all segments of this lecture!",
          });
        }
      } else {
        toast({
          title: "Score Too Low",
          description: `You need at least ${REQUIRED_SCORE_PERCENTAGE}% to proceed. Current score: ${scorePercentage}%. Try again!`,
          variant: "destructive",
        });
        // Reset current segment
        setCurrentStep(0);
        setSegmentScores(prev => ({ ...prev, [currentSegmentData.id]: 0 }));
        setAttemptedQuestions(new Set());
      }
    }
  };

  const handleCorrectAnswer = () => {
    if (!storyContent?.segments) return;
    
    const currentSegmentData = storyContent.segments[currentSegment];
    const questionIndex = currentStep - 2;
    const questionId = currentSegmentData.questions[questionIndex].id;
    
    if (!attemptedQuestions.has(questionId)) {
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
    const questionId = currentSegmentData.questions[questionIndex].id;
    
    if (!attemptedQuestions.has(questionId)) {
      setAttemptedQuestions(prev => new Set([...prev, questionId]));
      handleContinue();
    }
    
    toast({
      title: "Incorrect Answer",
      description: "Moving to the next question. You'll need to achieve 75% to complete this segment.",
      variant: "destructive",
    });
  };

  const handleBack = () => {
    navigate(`/course/${courseId}`);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading story content...</p>
        </div>
      </div>
    );
  }

  if (error || !storyContent?.segments?.length) {
    return (
      <div className="container mx-auto p-2">
        <Card className="p-3">
          <h2 className="text-lg font-bold text-red-600 mb-2">Error Loading Content</h2>
          <p className="text-sm text-muted-foreground mb-2">
            {error instanceof Error ? error.message : "Failed to load content"}
          </p>
          <Button onClick={handleBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Card>
      </div>
    );
  }

  const currentSegmentData = storyContent.segments[currentSegment];
  const isSlide = currentStep < 2;
  const slideIndex = currentStep;
  const questionIndex = currentStep - 2;
  const maxScore = TOTAL_QUESTIONS_PER_SEGMENT * POINTS_PER_CORRECT_ANSWER;
  const currentScore = segmentScores[currentSegmentData.id] || 0;

  const pathwayNodes = storyContent.segments.map((segment, index) => ({
    id: segment.id,
    title: segment.title,
    type: "concept" as const,
    difficulty: "intermediate" as const,
    prerequisites: index > 0 ? [storyContent.segments[index - 1].id] : [],
    points: maxScore,
    description: `Complete this segment about ${segment.title}`,
  }));

  return (
    <div className="container mx-auto p-2">
      <div className="mb-2">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="gap-1"
          size="sm"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="md:col-span-1">
          <Card className="p-2">
            <LearningPathway
              nodes={pathwayNodes}
              completedNodes={completedNodes}
              currentNode={currentSegmentData.id}
              onNodeSelect={(nodeId) => {
                const index = storyContent.segments.findIndex(s => s.id === nodeId);
                if (index !== -1 && completedNodes.has(storyContent.segments[index].id)) {
                  setCurrentSegment(index);
                  setCurrentStep(0);
                }
              }}
            />
          </Card>
        </div>

        <div className="md:col-span-2">
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
                maxPoints={maxScore}
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
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Story;
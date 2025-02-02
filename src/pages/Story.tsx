import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LearningPathway from "@/components/story/LearningPathway";
import { useStoryContent } from "@/hooks/useStoryContent";
import { StoryContainer } from "@/components/story/StoryContainer";
import { useQueryClient } from "@tanstack/react-query";

const POINTS_PER_CORRECT_ANSWER = 5;
const REQUIRED_SCORE_PERCENTAGE = 75;
const TOTAL_QUESTIONS_PER_SEGMENT = 2;

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

  const { 
    data: storyContent, 
    isLoading: isLoadingStory,
    error: storyError,
    refetch: refetchStory
  } = useStoryContent(lectureId);

  // Prefetch next segment
  useEffect(() => {
    if (storyContent?.segments && currentSegment < storyContent.segments.length - 1) {
      const nextSegment = currentSegment + 1;
      queryClient.prefetchQuery({
        queryKey: ['story-content', lectureId, nextSegment],
        queryFn: () => fetch(`/api/segment-content/${lectureId}/${nextSegment}`).then(res => res.json())
      });
    }
  }, [currentSegment, storyContent, lectureId, queryClient]);

  const handleContinue = () => {
    if (!storyContent?.segments) return;

    const totalSteps = 4;
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

  const handleBack = () => {
    navigate(`/course/${courseId}`);
  };

  // Handle loading state
  if (isLoadingStory) {
    return (
      <div className="container mx-auto p-2">
        <Card className="p-4">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Loading story content...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Handle error state
  if (storyError) {
    return (
      <div className="container mx-auto p-2">
        <Card className="p-3">
          <h2 className="text-lg font-bold text-red-600 mb-2">Error Loading Content</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Failed to load story content: {storyError.message}
          </p>
          <Button onClick={handleBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Card>
      </div>
    );
  }

  // Handle case when content is still being generated
  if (!storyContent?.segments?.length) {
    return (
      <div className="container mx-auto p-2">
        <Card className="p-4">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">
              Generating story content...
              <br />
              This may take a few moments.
            </p>
          </div>
        </Card>
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
        </div>
      </div>
    </div>
  );
};

export default Story;
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

const Story = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentSegment, setCurrentSegment] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);

  const { data: storyContent, isLoading, error } = useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      console.log('Fetching story content for lecture:', lectureId);
      const { data, error } = await supabase.functions.invoke('generate-story-content', {
        body: { lectureId }
      });

      if (error) {
        console.error('Error fetching story content:', error);
        throw error;
      }

      if (!data?.storyContent?.segments?.length) {
        console.error('Invalid story content structure:', data);
        throw new Error('Invalid story content structure');
      }

      console.log('Received story content:', data);
      return data.storyContent as StoryContent;
    }
  });

  const handleContinue = () => {
    if (!storyContent?.segments) return;

    const totalSteps = 4; // 2 slides + 2 questions
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else if (currentSegment < storyContent.segments.length - 1) {
      setCurrentSegment(prev => prev + 1);
      setCurrentStep(0);
    } else {
      // Story completed
      toast({
        title: "Congratulations!",
        description: `You've completed the lesson with a score of ${score}/${storyContent.segments.length * 2} questions correct!`,
      });
    }
  };

  const handleCorrectAnswer = () => {
    setScore(prev => prev + 1);
    handleContinue();
  };

  const handleWrongAnswer = () => {
    toast({
      title: "Try Again",
      description: "Review the explanation and try another answer.",
      variant: "destructive",
    });
  };

  const handleBack = () => {
    navigate(`/course/${courseId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </Card>
      </div>
    );
  }

  if (error || !storyContent?.segments?.length) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Content</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "Failed to load content"}
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2" />
            Back to Course
          </Button>
        </Card>
      </div>
    );
  }

  const currentSegmentData = storyContent.segments[currentSegment];
  if (!currentSegmentData) {
    console.error('Invalid segment index:', currentSegment);
    return (
      <div className="container mx-auto p-4">
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Segment</h2>
          <p className="text-muted-foreground mb-4">Failed to load segment content</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2" />
            Back to Course
          </Button>
        </Card>
      </div>
    );
  }

  const isSlide = currentStep < 2;
  const slideIndex = currentStep;
  const questionIndex = currentStep - 2;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 space-y-4">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </Button>
        
        <SegmentProgress
          currentSegment={currentSegment}
          totalSegments={storyContent.segments.length}
          currentStep={currentStep}
          totalSteps={4}
        />
      </div>

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">{currentSegmentData.title}</h2>
        
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
  );
};

export default Story;
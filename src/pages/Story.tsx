import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StoryProgress from "@/components/story/StoryProgress";
import ConceptDescription from "@/components/story/ConceptDescription";
import StoryQuiz from "@/components/story/StoryQuiz";
import LearningPathway from "@/components/story/LearningPathway";
import { useToast } from "@/hooks/use-toast";

type StoryStep = 
  | { type: "main_concept"; slideIndex: number; conceptId: string }
  | { type: "main_quiz"; quizIndex: number; conceptId: string }
  | { type: "related_concept"; conceptIndex: number; slideIndex: number; conceptId: string }
  | { type: "related_quiz"; conceptIndex: number; quizIndex: number; conceptId: string };

const Story = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<StoryStep | null>(null);
  const [nodePoints, setNodePoints] = useState<Record<string, number>>({});
  const [wrongAnswers, setWrongAnswers] = useState<Set<string>>(new Set());
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());

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

      console.log('Received story content:', data);
      return data.storyContent;
    }
  });

  const handleNodeSelect = (nodeId: string) => {
    const nodes = storyContent?.chapters?.[0]?.nodes;
    if (!nodes) {
      console.error('No nodes available');
      return;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      console.error('Node not found:', nodeId);
      return;
    }

    const isFirstNode = nodes[0].id === nodeId;
    const hasPrerequisites = node.prerequisites.every(prereq => completedNodes.has(prereq));
    
    if (isFirstNode || hasPrerequisites) {
      setCurrentStep({ 
        type: "main_concept", 
        slideIndex: 0, 
        conceptId: nodeId 
      });
      setNodePoints(prev => ({ ...prev, [nodeId]: 0 }));
      setWrongAnswers(new Set());
    } else {
      toast({
        title: "Node Locked",
        description: "Complete the prerequisites first",
        variant: "destructive"
      });
    }
  };

  const getCurrentContent = () => {
    if (!currentStep || !storyContent?.chapters?.[0]) {
      console.log('No current step or story content available');
      return null;
    }

    const currentNode = storyContent.chapters[0].nodes.find(
      n => n.id === currentStep.conceptId
    );
    if (!currentNode) {
      console.error('Current node not found:', currentStep.conceptId);
      return null;
    }

    switch (currentStep.type) {
      case "main_concept":
        const mainSlides = [
          `Introduction to ${currentNode.title}`,
          `Key principles of ${currentNode.title}`,
          `Advanced concepts in ${currentNode.title}`
        ];
        return {
          title: `${currentNode.title} - Part ${currentStep.slideIndex + 1}`,
          description: mainSlides[currentStep.slideIndex]
        };

      case "main_quiz":
        const mainQuiz = storyContent.chapters[0].initialQuizzes?.[currentStep.quizIndex];
        if (!mainQuiz) {
          console.error('Main quiz not found:', currentStep.quizIndex);
          return null;
        }
        return mainQuiz;

      case "related_concept": {
        const relatedConcept = storyContent.chapters[0].relatedConcepts?.[currentStep.conceptIndex];
        if (!relatedConcept) {
          console.error('Related concept not found:', currentStep.conceptIndex);
          return null;
        }
        const relatedSlides = [
          `Basic overview of ${relatedConcept.title}`,
          `Detailed exploration of ${relatedConcept.title}`
        ];
        return {
          title: `${relatedConcept.title} - Part ${currentStep.slideIndex + 1}`,
          description: relatedSlides[currentStep.slideIndex]
        };
      }

      case "related_quiz": {
        const relatedQuiz = storyContent.chapters[0].finalQuizzes?.[currentStep.quizIndex];
        if (!relatedQuiz) {
          console.error('Related quiz not found:', currentStep.quizIndex);
          return null;
        }
        return relatedQuiz;
      }
    }
  };

  const handleContinue = () => {
    if (!currentStep || !storyContent) return;

    const currentNode = storyContent.chapters[0].nodes.find(
      n => n.id === currentStep.conceptId
    );
    if (!currentNode) return;

    switch (currentStep.type) {
      case "main_concept":
        if (currentStep.slideIndex < 2) {
          // Show next main concept slide
          setCurrentStep({
            ...currentStep,
            slideIndex: currentStep.slideIndex + 1
          });
        } else {
          // Move to main quiz
          setCurrentStep({
            type: "main_quiz",
            quizIndex: 0,
            conceptId: currentStep.conceptId
          });
        }
        break;

      case "main_quiz":
        if (currentStep.quizIndex < 3) {
          // Show next main quiz
          setCurrentStep({
            ...currentStep,
            quizIndex: currentStep.quizIndex + 1
          });
        } else {
          // Move to first related concept
          setCurrentStep({
            type: "related_concept",
            conceptIndex: 0,
            slideIndex: 0,
            conceptId: currentStep.conceptId
          });
        }
        break;

      case "related_concept":
        if (currentStep.slideIndex < 1) {
          // Show next slide of current related concept
          setCurrentStep({
            ...currentStep,
            slideIndex: currentStep.slideIndex + 1
          });
        } else {
          // Move to related quiz
          setCurrentStep({
            type: "related_quiz",
            conceptIndex: currentStep.conceptIndex,
            quizIndex: 0,
            conceptId: currentStep.conceptId
          });
        }
        break;

      case "related_quiz":
        if (currentStep.quizIndex < 1) {
          // Show next quiz of current related concept
          setCurrentStep({
            ...currentStep,
            quizIndex: currentStep.quizIndex + 1
          });
        } else if (currentStep.conceptIndex < 2) {
          // Move to next related concept
          setCurrentStep({
            type: "related_concept",
            conceptIndex: currentStep.conceptIndex + 1,
            slideIndex: 0,
            conceptId: currentStep.conceptId
          });
        } else {
          // Check if enough points to complete node
          const points = nodePoints[currentStep.conceptId] || 0;
          if (points >= 75) {
            setCompletedNodes(prev => new Set([...prev, currentStep.conceptId]));
          }
          setCurrentStep(null);
        }
        break;
    }
  };

  const handleCorrectAnswer = () => {
    if (!currentStep) return;
    
    // Add 10 points if this question hasn't been answered wrong before
    const questionKey = JSON.stringify(currentStep);
    if (!wrongAnswers.has(questionKey)) {
      setNodePoints(prev => ({
        ...prev,
        [currentStep.conceptId]: (prev[currentStep.conceptId] || 0) + 10
      }));
    }
    handleContinue();
  };

  const handleWrongAnswer = () => {
    if (!currentStep) return;
    
    // Mark this question as answered incorrectly
    const questionKey = JSON.stringify(currentStep);
    setWrongAnswers(prev => new Set([...prev, questionKey]));
  };

  const renderCurrentStep = () => {
    if (!currentStep || !storyContent) return null;

    const content = getCurrentContent();
    if (!content) return null;

    switch (currentStep.type) {
      case "main_concept":
      case "related_concept":
        return (
          <ConceptDescription
            title={content.title}
            description={content.description}
            onContinue={handleContinue}
          />
        );

      case "main_quiz":
      case "related_quiz":
        return (
          <StoryQuiz
            question={content}
            onCorrectAnswer={handleCorrectAnswer}
            onWrongAnswer={handleWrongAnswer}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600">Error Loading Story</h2>
          <p className="text-gray-600">Please try again later</p>
          <Button onClick={() => navigate(`/course/${courseId}`)}>
            Back to Course
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/course/${courseId}`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </Button>
          {currentStep && (
            <StoryProgress
              currentPoints={nodePoints[currentStep.conceptId] || 0}
              maxPoints={100}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="order-2 md:order-1">
            <LearningPathway
              nodes={storyContent?.chapters[0]?.nodes || []}
              completedNodes={completedNodes}
              currentNode={currentStep?.conceptId || null}
              onNodeSelect={handleNodeSelect}
            />
          </div>
          
          {currentStep && (
            <div className="order-1 md:order-2">
              <Card className="p-6">
                {renderCurrentStep()}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Story;

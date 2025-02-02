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

type StoryStep = 
  | { type: "concept"; conceptId: string }
  | { type: "quiz"; quizIndex: number; conceptId: string }
  | { type: "related_concept"; conceptId: string; relatedIndex: number }
  | { type: "final_quiz"; quizIndex: number; conceptId: string };

const Story = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<StoryStep>({ 
    type: "concept", 
    conceptId: "" 
  });
  const [storyPoints, setStoryPoints] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<Set<string>>(new Set());
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());

  const { data: storyContent, isLoading } = useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-story-content', {
        body: { lectureId }
      });

      if (error) throw error;
      return data.storyContent;
    }
  });

  const currentChapter = storyContent?.chapters[currentChapterIndex];
  const maxPointsPerChapter = 7; // 2 initial quizzes + 5 final quizzes

  const handleNodeSelect = (nodeId: string) => {
    const node = storyContent?.chapters.find(chapter => 
      chapter.nodes.some(n => n.id === nodeId)
    );
    
    if (node) {
      setCurrentStep({ type: "concept", conceptId: nodeId });
    }
  };

  const handleContinue = () => {
    if (!currentChapter) return;

    if (currentStep.type === "concept") {
      setCurrentStep({ type: "quiz", quizIndex: 0, conceptId: currentStep.conceptId });
    } else if (currentStep.type === "quiz") {
      const nextQuizIndex = (currentStep.quizIndex + 1);
      if (nextQuizIndex < currentChapter.initialQuizzes.length) {
        setCurrentStep({ type: "quiz", quizIndex: nextQuizIndex, conceptId: currentStep.conceptId });
      } else {
        setCurrentStep({ 
          type: "related_concept", 
          conceptId: currentChapter.relatedConcepts[0].id,
          relatedIndex: 0 
        });
      }
    } else if (currentStep.type === "related_concept") {
      const nextIndex = currentStep.relatedIndex + 1;
      if (nextIndex < currentChapter.relatedConcepts.length) {
        setCurrentStep({ 
          type: "related_concept",
          conceptId: currentChapter.relatedConcepts[nextIndex].id,
          relatedIndex: nextIndex 
        });
      } else {
        setCurrentStep({ type: "final_quiz", quizIndex: 0, conceptId: currentStep.conceptId });
      }
    } else if (currentStep.type === "final_quiz") {
      const nextQuizIndex = currentStep.quizIndex + 1;
      if (nextQuizIndex < currentChapter.finalQuizzes.length) {
        setCurrentStep({ type: "final_quiz", quizIndex: nextQuizIndex, conceptId: currentStep.conceptId });
      } else if (storyPoints >= maxPointsPerChapter) {
        // Move to next chapter if enough points
        if (currentChapterIndex + 1 < storyContent.chapters.length) {
          setCurrentChapterIndex(prev => prev + 1);
          setCurrentStep({ type: "concept", conceptId: "" });
          setStoryPoints(0);
          setWrongAnswers(new Set());
        }
      }
    }
  };

  const handleCorrectAnswer = () => {
    if (!wrongAnswers.has(JSON.stringify(currentStep))) {
      setStoryPoints(prev => prev + 1);
      setCompletedNodes(prev => new Set([...prev, currentStep.conceptId]));
    }
    handleContinue();
  };

  const handleWrongAnswer = () => {
    setWrongAnswers(prev => new Set([...prev, JSON.stringify(currentStep)]));
    if (currentStep.type === "final_quiz") {
      const relatedConceptIds = currentChapter?.finalQuizzes[currentStep.quizIndex].relatedConceptIds;
      if (relatedConceptIds?.length) {
        setCurrentStep({ 
          type: "related_concept",
          conceptId: relatedConceptIds[0],
          relatedIndex: currentChapter.relatedConcepts.findIndex(c => c.id === relatedConceptIds[0])
        });
      }
    }
  };

  const renderCurrentStep = () => {
    if (!currentChapter) return null;

    switch (currentStep.type) {
      case "concept":
        const concept = currentChapter.nodes.find(n => n.id === currentStep.conceptId);
        return concept ? (
          <ConceptDescription
            title={concept.title}
            description={currentChapter.mainDescription}
            onContinue={handleContinue}
          />
        ) : null;

      case "quiz":
        return (
          <StoryQuiz
            question={currentChapter.initialQuizzes[currentStep.quizIndex]}
            onCorrectAnswer={handleCorrectAnswer}
            onWrongAnswer={handleWrongAnswer}
          />
        );

      case "related_concept":
        const relatedConcept = currentChapter.relatedConcepts[currentStep.relatedIndex];
        return relatedConcept ? (
          <ConceptDescription
            title={relatedConcept.title}
            description={relatedConcept.description}
            onContinue={handleContinue}
          />
        ) : null;

      case "final_quiz":
        return (
          <StoryQuiz
            question={currentChapter.finalQuizzes[currentStep.quizIndex]}
            onCorrectAnswer={handleCorrectAnswer}
            onWrongAnswer={handleWrongAnswer}
          />
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
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
          <StoryProgress
            currentPoints={storyPoints}
            maxPoints={maxPointsPerChapter}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="order-2 md:order-1">
            <LearningPathway
              nodes={currentChapter?.nodes || []}
              completedNodes={completedNodes}
              currentNode={currentStep.conceptId}
              onNodeSelect={handleNodeSelect}
            />
          </div>
          
          {currentStep.conceptId && (
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
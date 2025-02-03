import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoryContainer } from "@/components/story/StoryContainer";
import StoryLoading from "@/components/story/StoryLoading";
import StoryError from "@/components/story/StoryError";

const StoryContent = () => {
  const { courseId, lectureId, nodeId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [segmentScores, setSegmentScores] = useState<{ [key: string]: number }>({});

  const { data: content, isLoading, error } = useQuery({
    queryKey: ['segment-content', lectureId, nodeId],
    queryFn: async () => {
      if (!lectureId || !nodeId) throw new Error('Lecture ID and Node ID are required');

      const segmentNumber = parseInt(nodeId.split('_')[1]);

      const { data: storyStructure, error: structureError } = await supabase
        .from('story_structures')
        .select('*, segment_contents(*)')
        .eq('lecture_id', parseInt(lectureId))
        .single();

      if (structureError) throw structureError;
      if (!storyStructure) throw new Error('Story structure not found');

      const segmentContent = storyStructure.segment_contents?.find(
        content => content.segment_number === segmentNumber
      );

      if (!segmentContent) {
        return {
          segments: [{
            id: nodeId,
            title: storyStructure[`segment_${segmentNumber}_title`],
            slides: [],
            questions: []
          }]
        };
      }

      return {
        segments: [{
          id: nodeId,
          title: storyStructure[`segment_${segmentNumber}_title`],
          slides: [
            { content: segmentContent.theory_slide_1 || '' },
            { content: segmentContent.theory_slide_2 || '' }
          ],
          questions: [
            segmentContent.quiz_question_1,
            segmentContent.quiz_question_2
          ]
        }]
      };
    }
  });

  const handleBack = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/story/nodes`);
  };

  const handleContinue = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleCorrectAnswer = () => {
    if (!nodeId) return;
    setSegmentScores(prev => ({
      ...prev,
      [nodeId]: (prev[nodeId] || 0) + 5
    }));
    handleContinue();
  };

  const handleWrongAnswer = () => {
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

  return (
    <div className="container mx-auto p-2">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-4"
      >
        <ArrowLeft className="mr-2" />
        Back to Learning Pathway
      </Button>

      <Card className="p-4">
        <StoryContainer
          storyContent={content}
          currentSegment={0}
          currentStep={currentStep}
          segmentScores={segmentScores}
          onContinue={handleContinue}
          onCorrectAnswer={handleCorrectAnswer}
          onWrongAnswer={handleWrongAnswer}
        />
      </Card>
    </div>
  );
};

export default StoryContent;
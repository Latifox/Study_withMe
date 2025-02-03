import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trophy, Star, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoryContainer } from "@/components/story/StoryContainer";
import StoryLoading from "@/components/story/StoryLoading";
import StoryError from "@/components/story/StoryError";
import { useToast } from "@/hooks/use-toast";

const StoryContent = () => {
  const { courseId, lectureId, nodeId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [segmentScores, setSegmentScores] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

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
        
        return {
          segments: [{
            id: nodeId,
            title: storyStructure[`segment_${segmentNumber}_title`] || `Segment ${segmentNumber}`,
            slides: [
              { id: 'slide-1', content: generatedContent.segmentContent.theory_slide_1 },
              { id: 'slide-2', content: generatedContent.segmentContent.theory_slide_2 }
            ],
            questions: [
              { id: 'q1', ...generatedContent.segmentContent.quiz_question_1 },
              { id: 'q2', ...generatedContent.segmentContent.quiz_question_2 }
            ]
          }]
        };
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
            { id: 'q1', ...segmentContent.quiz_question_1 },
            { id: 'q2', ...segmentContent.quiz_question_2 }
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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="hover:scale-105 transition-transform"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Learning Pathway
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            <span className="font-bold">{currentScore} XP</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-500" />
            <span className="font-bold">{Math.floor(currentScore / 10)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-blue-500" />
            <span className="font-bold">{currentStep}/4</span>
          </div>
        </div>
      </div>

      <Card className="p-6 shadow-lg transform hover:scale-[1.01] transition-transform duration-200 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
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

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, Trophy, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LearningPathway from "@/components/story/LearningPathway";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StoryLoading from "@/components/story/StoryLoading";
import StoryError from "@/components/story/StoryError";
import { useToast } from "@/hooks/use-toast";

const StoryNodes = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [completedNodes] = useState(new Set<string>());
  const [loadingNode, setLoadingNode] = useState<string | null>(null);
  const { toast } = useToast();

  // Add a new query to fetch user progress
  const { data: userProgress } = useQuery({
    queryKey: ['user-progress', lectureId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !lectureId) return null;

      const { data } = await supabase
        .from('user_progress')
        .select('score')
        .eq('user_id', user.id)
        .eq('lecture_id', parseInt(lectureId));

      return data;
    }
  });

  // Calculate total XP and completed nodes
  const totalXP = userProgress?.reduce((sum, progress) => sum + (progress.score || 0), 0) || 0;
  const completedNodesCount = userProgress?.filter(progress => (progress.score || 0) >= 10).length || 0;

  const { data: storyContent, isLoading, error } = useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      console.log('Fetching story structure for lecture:', lectureId);

      const { data: storyStructure, error: structureError } = await supabase
        .from('story_structures')
        .select('*')
        .eq('lecture_id', parseInt(lectureId))
        .maybeSingle();

      if (structureError) {
        console.error('Error fetching story structure:', structureError);
        throw structureError;
      }

      if (!storyStructure) {
        console.log('No story structure found, generating new content...');
        const { data: generatedStructure, error: generationError } = await supabase.functions.invoke('generate-story-content', {
          body: { lectureId: parseInt(lectureId) }
        });

        if (generationError) {
          console.error('Error generating story content:', generationError);
          throw generationError;
        }

        console.log('Successfully generated new story structure:', generatedStructure);
        return {
          segments: Array.from({ length: 10 }, (_, i) => ({
            id: `segment_${i + 1}`,
            title: generatedStructure.storyStructure[`segment_${i + 1}_title`] || `Lesson ${i + 1}`,
            type: (i % 3 === 0 ? "quiz" : "concept") as "concept" | "quiz" | "challenge",
            difficulty: (i < 3 ? "beginner" : i < 7 ? "intermediate" : "advanced") as "beginner" | "intermediate" | "advanced",
            prerequisites: i === 0 ? [] : [`segment_${i}`],
            points: (i + 1) * 10,
            description: `Master the concepts of ${generatedStructure.storyStructure[`segment_${i + 1}_title`] || `Lesson ${i + 1}`}`,
          }))
        };
      }

      return {
        segments: Array.from({ length: 10 }, (_, i) => ({
          id: `segment_${i + 1}`,
          title: storyStructure[`segment_${i + 1}_title`] || `Lesson ${i + 1}`,
          type: (i % 3 === 0 ? "quiz" : "concept") as "concept" | "quiz" | "challenge",
          difficulty: (i < 3 ? "beginner" : i < 7 ? "intermediate" : "advanced") as "beginner" | "intermediate" | "advanced",
          prerequisites: i === 0 ? [] : [`segment_${i}`],
          points: (i + 1) * 10,
          description: `Master the concepts of ${storyStructure[`segment_${i + 1}_title`] || `Lesson ${i + 1}`}`,
        }))
      };
    },
    retry: 1
  });

  const handleBack = () => {
    navigate(`/course/${courseId}`);
  };

  const handleNodeSelect = async (nodeId: string) => {
    setLoadingNode(nodeId);
    navigate(`/course/${courseId}/lecture/${lectureId}/story/content/${nodeId}`);
  };

  const handleStudyInDetail = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/chat`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <StoryLoading />
      </div>
    );
  }

  if (error || !storyContent) {
    return (
      <div className="container mx-auto p-4">
        <StoryError 
          message={error instanceof Error ? error.message : "Failed to load story content"}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Button>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleStudyInDetail}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Study the lecture in detail
          </Button>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            <span className="font-bold">{totalXP} XP</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-500" />
            <span className="font-bold">{completedNodesCount}</span>
          </div>
        </div>
      </div>

      <Card className="p-6 bg-white/50 backdrop-blur-sm">
        <LearningPathway
          nodes={storyContent.segments}
          completedNodes={completedNodes}
          currentNode={loadingNode}
          onNodeSelect={handleNodeSelect}
        />
      </Card>
    </div>
  );
};

export default StoryNodes;

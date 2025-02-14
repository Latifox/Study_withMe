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
  const {
    data: userProgress
  } = useQuery({
    queryKey: ['user-progress', lectureId],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user || !lectureId) return null;
      const {
        data
      } = await supabase.from('user_progress').select('score').eq('user_id', user.id).eq('lecture_id', parseInt(lectureId));
      return data;
    }
  });

  // Calculate total XP and completed nodes
  const totalXP = userProgress?.reduce((sum, progress) => sum + (progress.score || 0), 0) || 0;
  const completedNodesCount = userProgress?.filter(progress => (progress.score || 0) >= 10).length || 0;
  const {
    data: storyContent,
    isLoading,
    error
  } = useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      console.log('Fetching segments for lecture:', lectureId);
      const {
        data: segments,
        error: segmentsError
      } = await supabase.from('lecture_segments').select('*').eq('lecture_id', parseInt(lectureId)).order('sequence_number', {
        ascending: true
      });
      if (segmentsError) {
        console.error('Error fetching segments:', segmentsError);
        throw segmentsError;
      }
      return {
        segments: segments.map((segment, i) => ({
          id: `segment_${segment.sequence_number}`,
          title: segment.title,
          type: (i % 3 === 0 ? "quiz" : "concept") as "concept" | "quiz" | "challenge",
          difficulty: (i < 3 ? "beginner" : i < 7 ? "intermediate" : "advanced") as "beginner" | "intermediate" | "advanced",
          prerequisites: i === 0 ? [] : [`segment_${segment.sequence_number - 1}`],
          points: (i + 1) * 10,
          description: `Master the concepts of ${segment.title}`
        }))
      };
    }
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
    return <div className="container mx-auto p-4">
        <StoryLoading />
      </div>;
  }
  if (error || !storyContent) {
    return <div className="container mx-auto p-4">
        <StoryError message={error instanceof Error ? error.message : "Failed to load story content"} onBack={handleBack} />
      </div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F2FCE2] via-[#FEF7CD] to-[#FDE1D3]">
        {/* Soft mesh pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="black" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Soft animated orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#E5DEFF] rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFDEE2] rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-[#D3E4FD] rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto p-4 relative">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            className="flex items-center gap-2 bg-white/30 hover:bg-white/40 text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Button>

          <div className="flex items-center gap-4 my-0 py-0 mx-[80px] px-[200px]">
            <Button 
              variant="outline" 
              onClick={handleStudyInDetail} 
              className="flex items-center gap-2 bg-white/40 hover:bg-white/50 text-gray-700 border-gray-200/50"
            >
              <BookOpen className="h-4 w-4" />
              Study the lecture in detail
            </Button>
            <div className="flex items-center gap-2 bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg">
              <Star className="h-5 w-5 text-yellow-400" />
              <span className="font-bold text-gray-700">{totalXP} XP</span>
            </div>
            <div className="flex items-center gap-2 bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg">
              <Trophy className="h-5 w-5 text-purple-500" />
              <span className="font-bold text-gray-700">{completedNodesCount}</span>
            </div>
          </div>
        </div>

        <Card className="p-6 bg-white/50 backdrop-blur-sm border-white/20 shadow-xl">
          <LearningPathway 
            nodes={storyContent?.segments || []} 
            completedNodes={completedNodes} 
            currentNode={loadingNode} 
            onNodeSelect={handleNodeSelect} 
          />
        </Card>
      </div>
    </div>
  );
};

export default StoryNodes;

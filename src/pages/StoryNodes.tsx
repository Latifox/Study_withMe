
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, BookOpen, Sparkles, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LearningPathway from "@/components/story/LearningPathway";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StoryLoading from "@/components/story/StoryLoading";
import StoryError from "@/components/story/StoryError";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const StoryNodes = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [completedNodes] = useState(new Set<string>());
  const [loadingNode, setLoadingNode] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    data: userProgress
  } = useQuery({
    queryKey: ['user-progress', lectureId],
    queryFn: async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user || !lectureId) return null;
      const { data } = await supabase
        .from('user_progress')
        .select('score, completed_at')
        .eq('user_id', user.id)
        .eq('lecture_id', parseInt(lectureId))
        .order('completed_at', { ascending: false });
      return data;
    }
  });

  const calculateStreak = () => {
    if (!userProgress?.length) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const uniqueDates = new Set(
      userProgress
        .filter(p => p.completed_at)
        .map(p => {
          const date = new Date(p.completed_at);
          date.setHours(0, 0, 0, 0);
          return date.toISOString();
        })
    );

    let streak = 0;
    let currentDate = today;

    while (uniqueDates.has(currentDate.toISOString())) {
      streak++;
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() - 1);
      currentDate.setHours(0, 0, 0, 0);
    }

    return streak;
  };

  const totalXP = userProgress?.reduce((sum, progress) => sum + (progress.score || 0), 0) || 0;
  const completedNodesCount = userProgress?.filter(progress => (progress.score || 0) >= 10).length || 0;
  const currentStreak = calculateStreak();

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
    return <div className="container mx-auto p-4"><StoryLoading /></div>;
  }

  if (error || !storyContent) {
    return <div className="container mx-auto p-4">
      <StoryError message={error instanceof Error ? error.message : "Failed to load story content"} onBack={handleBack} />
    </div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-500">
        <motion.div 
          animate={{ 
            y: [0, -30, 0],
            x: [0, 20, 0]
          }} 
          transition={{ 
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-20 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-70"
        />
        <motion.div 
          animate={{ 
            y: [0, 30, 0],
            x: [0, -20, 0]
          }} 
          transition={{ 
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
          className="absolute top-0 right-20 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-70"
        />
        <motion.div 
          animate={{ 
            y: [-20, 20, -20],
            x: [10, -10, 10]
          }} 
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-20 left-1/3 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-70"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/70 via-transparent to-transparent" />
      </div>

      <div className="container mx-auto p-4 relative">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-6"
        >
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lectures
          </Button>

          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleStudyInDetail} 
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-white/20 transition-all duration-300 hover:scale-105"
            >
              <BookOpen className="h-4 w-4" />
              Study in Detail
            </Button>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg"
            >
              <Flame className="h-5 w-5 text-red-500 fill-red-500" />
              <span className="font-bold text-white">{currentStreak}</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg"
            >
              <BookOpen className="h-5 w-5 text-emerald-200" />
              <span className="font-bold text-white">{completedNodesCount}</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg"
            >
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-white">{totalXP}</span>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 shadow-xl relative overflow-hidden">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-4 right-4"
            >
              <Sparkles className="w-6 h-6 text-emerald-200" />
            </motion.div>

            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <div className="relative z-10 mb-8">
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-center text-white mb-2"
              >
                Your Learning Adventure
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center text-emerald-100 opacity-80"
              >
                Complete nodes to earn XP and unlock new content
              </motion.p>
            </div>

            <div className="relative z-10">
              <LearningPathway 
                nodes={storyContent?.segments || []} 
                completedNodes={completedNodes} 
                currentNode={loadingNode} 
                onNodeSelect={handleNodeSelect} 
              />
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default StoryNodes;

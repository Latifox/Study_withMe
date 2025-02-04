import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, CheckCircle2, Circle, Trophy, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";

interface LessonNode {
  id: string;
  title: string;
  type: "concept" | "quiz" | "challenge";
  difficulty: "beginner" | "intermediate" | "advanced";
  prerequisites: string[];
  points: number;
  description: string;
}

interface LearningPathwayProps {
  nodes: LessonNode[];
  completedNodes: Set<string>;
  currentNode: string | null;
  onNodeSelect: (nodeId: string) => void;
}

const LearningPathway = ({ 
  nodes, 
  completedNodes, 
  currentNode, 
  onNodeSelect 
}: LearningPathwayProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [nodeProgress, setNodeProgress] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();
  const { lectureId } = useParams();

  useEffect(() => {
    const fetchUserProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !lectureId) return;

      const { data: progress } = await supabase
        .from('user_progress')
        .select('segment_number, score')
        .eq('user_id', user.id)
        .eq('lecture_id', parseInt(lectureId))
        .order('created_at', { ascending: false });

      if (progress) {
        const progressMap: { [key: string]: number } = {};
        progress.forEach(p => {
          progressMap[`segment_${p.segment_number}`] = p.score || 0;
        });
        setNodeProgress(progressMap);
      }
    };

    fetchUserProgress();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('user-progress-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `lecture_id=eq.${lectureId}`
        },
        (payload) => {
          if (payload.new && 'segment_number' in payload.new && 'score' in payload.new) {
            setNodeProgress(prev => ({
              ...prev,
              [`segment_${payload.new.segment_number}`]: payload.new.score || 0
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lectureId]);

  const isNodeAvailable = (node: LessonNode) => {
    if (node.prerequisites.length === 0) return true;
    
    return node.prerequisites.every(prereq => {
      const prereqScore = nodeProgress[prereq] || 0;
      // Node is only available if the prerequisite node has been completed (score >= 10)
      return prereqScore >= 10;
    });
  };

  const getNodeStatus = (node: LessonNode) => {
    const nodeScore = nodeProgress[node.id] || 0;
    if (nodeScore >= 10) return "completed";
    if (isNodeAvailable(node)) return "available";
    return "locked";
  };

  const handleNodeClick = async (node: LessonNode) => {
    const status = getNodeStatus(node);
    if (status === "locked") {
      const prerequisiteNodes = node.prerequisites.map(prereq => {
        const prereqNode = nodes.find(n => n.id === prereq);
        return prereqNode?.title || prereq;
      });
      
      toast({
        title: "Node Locked",
        description: `Complete ${prerequisiteNodes.join(", ")} first to unlock this node. You need 10 XP in each prerequisite node.`,
        variant: "destructive",
      });
      return;
    }

    const currentScore = nodeProgress[node.id] || 0;
    if (currentScore >= 10 && status === "completed") {
      toast({
        description: "You've already completed this node with full points! You can still retry it if you want.",
      });
    }

    onNodeSelect(node.id);
  };

  const getNodeIcon = (status: string, isHovered: boolean) => {
    if (status === "locked") return <Lock className="w-4 h-4 text-gray-400" />;
    if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (isHovered) return <Sparkles className="w-4 h-4 text-yellow-500" />;
    return <Circle className="w-4 h-4 text-blue-500" />;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-700";
      case "intermediate": return "bg-yellow-100 text-yellow-700";
      case "advanced": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="relative w-full min-h-[600px] p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-50" />
      
      <div className="relative">
        <h2 className="text-2xl font-bold text-center mb-8 text-primary">
          Learning Journey
        </h2>
        
        <div className="flex flex-col items-center space-y-6">
          {nodes.map((node, index) => {
            const status = getNodeStatus(node);
            const isActive = currentNode === node.id;
            const isHovered = hoveredNode === node.id;
            const currentScore = nodeProgress[node.id] || 0;
            
            return (
              <motion.div
                key={node.id}
                className="w-full max-w-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        onClick={() => handleNodeClick(node)}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        className={cn(
                          "w-full p-4 rounded-lg shadow-lg transition-all duration-300",
                          "flex items-center justify-between",
                          status === "locked" 
                            ? "bg-gray-100 cursor-not-allowed opacity-75" 
                            : "hover:scale-105 hover:shadow-xl",
                          status === "completed" ? "bg-green-50 border-2 border-green-200" : "",
                          status === "available" ? "bg-white border-2 border-blue-200" : "",
                          isActive ? "ring-2 ring-primary ring-offset-2" : ""
                        )}
                        whileHover={{ scale: status !== "locked" ? 1.05 : 1 }}
                        whileTap={{ scale: status !== "locked" ? 0.95 : 1 }}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            status === "completed" ? "bg-green-100" : "",
                            status === "available" ? "bg-blue-100" : "",
                            status === "locked" ? "bg-gray-200" : ""
                          )}>
                            {getNodeIcon(status, isHovered)}
                          </div>
                          
                          <div className="text-left">
                            <h3 className="font-semibold text-lg">{node.title}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={cn(
                                "text-xs px-2 py-1 rounded-full",
                                getDifficultyColor(node.difficulty)
                              )}>
                                {node.difficulty}
                              </span>
                              <motion.div 
                                className="flex items-center space-x-1"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.3 }}
                                key={currentScore} // This ensures animation triggers on score change
                              >
                                <Star className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm text-gray-600">{currentScore}/10 XP</span>
                              </motion.div>
                            </div>
                          </div>
                        </div>

                        {status === "completed" && (
                          <Trophy className="w-6 h-6 text-yellow-500" />
                        )}
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px] p-4">
                      <div className="space-y-2">
                        <p className="font-semibold">{node.title}</p>
                        <p className="text-sm text-gray-500">{node.description}</p>
                        {status === "locked" && node.prerequisites.length > 0 && (
                          <div className="text-sm text-red-500">
                            <p className="font-semibold">Prerequisites:</p>
                            <ul className="list-disc list-inside">
                              {node.prerequisites.map(prereq => {
                                const prereqNode = nodes.find(n => n.id === prereq);
                                const prereqScore = nodeProgress[prereq] || 0;
                                return (
                                  <li key={prereq}>
                                    {prereqNode?.title || prereq} ({prereqScore}/10 XP)
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {index < nodes.length - 1 && (
                  <motion.div
                    className="h-8 w-0.5 bg-gray-200 mx-auto my-2"
                    initial={{ height: 0 }}
                    animate={{ height: 32 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LearningPathway;
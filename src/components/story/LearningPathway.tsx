
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, CheckCircle2, Circle, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

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

interface UserProgressPayload {
  new: {
    segment_number: number;
    score: number;
  };
  old: {
    segment_number: number;
    score: number;
  } | null;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}

const LearningPathway = ({
  nodes,
  completedNodes,
  currentNode,
  onNodeSelect
}: LearningPathwayProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [nodeProgress, setNodeProgress] = useState<{
    [key: string]: number;
  }>({});
  const {
    toast
  } = useToast();
  const {
    lectureId
  } = useParams();

  useEffect(() => {
    const fetchUserProgress = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user || !lectureId) return;
      const {
        data: progress
      } = await supabase.from('user_progress').select('segment_number, score').eq('user_id', user.id).eq('lecture_id', parseInt(lectureId)).order('created_at', {
        ascending: false
      });
      if (progress) {
        const progressMap: {
          [key: string]: number;
        } = {};
        progress.forEach(p => {
          progressMap[`segment_${p.segment_number}`] = p.score || 0;
        });
        setNodeProgress(progressMap);
      }
    };
    fetchUserProgress();

    const channel = supabase.channel('user-progress-updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_progress',
      filter: `lecture_id=eq.${lectureId}`
    }, (payload: RealtimePostgresChangesPayload<any>) => {
      const data = payload.new as {
        segment_number: number;
        score: number;
      } | null;
      if (data && typeof data.segment_number === 'number' && typeof data.score === 'number') {
        const segmentKey = `segment_${data.segment_number}`;
        setNodeProgress(prev => ({
          ...prev,
          [segmentKey]: data.score
        }));
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [lectureId]);

  const isNodeAvailable = (node: LessonNode) => {
    if (node.prerequisites.length === 0) return true;
    return node.prerequisites.every(prereq => {
      const prereqScore = nodeProgress[prereq] || 0;
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
        variant: "destructive"
      });
      return;
    }
    onNodeSelect(node.id);
  };

  return <div className="relative w-full min-h-[600px] p-8">
    <div className="absolute inset-0 rounded-lg"></div>
    
    <div className="relative">
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
                        "relative overflow-hidden",
                        status === "locked" 
                          ? "bg-gray-800/50 cursor-not-allowed" 
                          : "hover:scale-105 hover:shadow-xl",
                        status === "completed" 
                          ? "bg-green-700/30 border-2 border-green-400/70"
                          : "",
                        status === "available" 
                          ? "bg-yellow-500/20 border-2 border-yellow-300/50" 
                          : "",
                        isActive 
                          ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-emerald-900"
                          : ""
                      )}
                      whileHover={status !== "locked" ? { scale: 1.05 } : {}}
                      whileTap={status !== "locked" ? { scale: 0.95 } : {}}
                    >
                      {status === "completed" && (
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-green-400/30 to-green-500/20 opacity-50"></div>
                      )}
                      
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          "transition-all duration-300",
                          status === "completed" ? "bg-green-500 shadow-md shadow-green-500/30" : "",
                          status === "available" ? "bg-yellow-400/60" : "",
                          status === "locked" ? "bg-gray-700" : "",
                          isActive ? "ring-2 ring-yellow-400" : ""
                        )}>
                          {status === "locked" ? <Lock className="w-4 h-4 text-gray-400" /> : status === "completed" ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Circle className="w-4 h-4 text-emerald-900" />}
                        </div>
                        
                        <div className="text-left">
                          <h3 className="font-semibold text-lg text-white">{node.title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full",
                              "backdrop-blur-sm",
                              node.difficulty === "beginner" ? "bg-green-500/20 text-green-200" : "",
                              node.difficulty === "intermediate" ? "bg-yellow-500/20 text-yellow-200" : "",
                              node.difficulty === "advanced" ? "bg-red-500/20 text-red-200" : ""
                            )}>
                              {node.difficulty}
                            </span>
                            <div className="flex items-center space-x-1">
                              <motion.div 
                                className="flex items-center space-x-1"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.3 }}
                                key={currentScore}
                              >
                                <Star className={cn(
                                  "w-6 h-6", 
                                  "text-yellow-500 fill-yellow-500" // Always keep star yellow
                                )} />
                                <span className={cn(
                                  "text-sm",
                                  status === "completed" ? "text-green-200" : "text-yellow-200"
                                )}>{currentScore}/10</span>
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="right" 
                    className={cn(
                      "max-w-[300px] p-4 border",
                      status === "completed" ? "bg-gray-900/90 border-green-500/40" : "bg-gray-900/90 border-emerald-500/20"
                    )}
                  >
                    <div className="space-y-2">
                      <p className="font-semibold text-white">{node.title}</p>
                      <p className="text-sm text-yellow-200">{node.description}</p>
                      {status === "locked" && node.prerequisites.length > 0 && (
                        <div className="text-sm text-red-300">
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
                      {status === "completed" && (
                        <div className="text-sm text-green-300 font-semibold mt-2">
                          ✓ Completed
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {index < nodes.length - 1 && (
                <motion.div 
                  className={cn(
                    "h-8 w-0.5 mx-auto my-2",
                    status === "completed" ? "bg-green-400/70" : "bg-yellow-400/50"
                  )}
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
  </div>;
};

export default LearningPathway;

import { useState } from "react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const isNodeAvailable = (node: LessonNode) => {
    if (node.prerequisites.length === 0) return true;
    return node.prerequisites.every(prereq => completedNodes.has(prereq));
  };

  const getNodeStatus = (node: LessonNode) => {
    if (completedNodes.has(node.id)) return "completed";
    if (isNodeAvailable(node)) return "available";
    return "locked";
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto py-8">
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2" />
      
      <div className="relative space-y-12">
        {nodes.map((node, index) => {
          const status = getNodeStatus(node);
          const isActive = currentNode === node.id;
          
          return (
            <motion.div
              key={node.id}
              className="relative flex items-center justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => status !== "locked" && onNodeSelect(node.id)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className={cn(
                        "relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        status === "locked" ? "bg-gray-100 cursor-not-allowed" : "hover:scale-110",
                        status === "completed" ? "bg-green-100" : "",
                        status === "available" ? "bg-blue-100" : "",
                        isActive ? "ring-2 ring-primary ring-offset-2" : ""
                      )}
                    >
                      {status === "locked" && <Lock className="w-5 h-5 text-gray-400" />}
                      {status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {status === "available" && <Circle className="w-5 h-5 text-blue-500" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="p-2 space-y-1">
                      <p className="font-semibold">{node.title}</p>
                      <p className="text-sm text-gray-500">{node.description}</p>
                      <p className="text-xs text-primary">Points: {node.points}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LearningPathway;
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

  const handleNodeClick = (node: LessonNode) => {
    const status = getNodeStatus(node);
    if (status !== "locked") {
      onNodeSelect(node.id);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-14rem)] flex items-center justify-center px-4">
      <div className="absolute left-[55%] h-full w-0.5 bg-gray-200 -translate-x-1/2" />
      
      <div className="relative flex flex-col justify-between h-full py-4">
        {nodes.map((node, index) => {
          const status = getNodeStatus(node);
          const isActive = currentNode === node.id;
          const hasPrerequisites = node.prerequisites.length > 0;
          
          return (
            <motion.div
              key={node.id}
              className="relative flex items-center justify-center gap-2"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="absolute right-full pr-4 w-40">
                <p className="text-xs font-medium text-right truncate" title={node.title}>
                  {node.title}
                </p>
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleNodeClick(node)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className={cn(
                        "relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                        status === "locked" ? "bg-gray-100 cursor-not-allowed" : "hover:scale-110",
                        status === "completed" ? "bg-green-100" : "",
                        status === "available" ? "bg-blue-100" : "",
                        isActive ? "ring-2 ring-primary ring-offset-2" : ""
                      )}
                      disabled={status === "locked"}
                    >
                      {status === "locked" && <Lock className="w-3 h-3 text-gray-400" />}
                      {status === "completed" && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      {status === "available" && <Circle className="w-3 h-3 text-blue-500" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <div className="space-y-1">
                      <p className="font-semibold text-xs">{node.title}</p>
                      <p className="text-xs text-gray-500">{node.description}</p>
                      <p className="text-xs text-primary">Points: {node.points}</p>
                      {status === "locked" && hasPrerequisites && (
                        <div className="text-xs text-red-500">
                          <p>Prerequisites needed:</p>
                          <ul className="list-disc list-inside">
                            {node.prerequisites.map(prereq => {
                              const prereqNode = nodes.find(n => n.id === prereq);
                              return (
                                <li key={prereq}>
                                  {prereqNode?.title || prereq}
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LearningPathway;
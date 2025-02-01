import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

interface MindmapNode {
  id: string;
  label: string;
  type: "main" | "subtopic" | "detail";
  parentId: string | null;
}

interface MindmapData {
  nodes: MindmapNode[];
}

const Mindmap = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: mindmapData, isLoading } = useQuery({
    queryKey: ['mindmap', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<MindmapData>("generate-mindmap", {
        body: { lectureId },
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to generate mindmap. Please try again.",
          variant: "destructive",
        });
        throw error;
      }

      return JSON.parse(data as unknown as string) as MindmapData;
    },
  });

  const renderNode = (node: MindmapNode, level: number, isLastChild: boolean = false) => {
    const children = mindmapData?.nodes.filter(n => n.parentId === node.id) || [];
    const paddingLeft = level * 4;
    
    let nodeClassName = "relative py-2 animate-fade-in ";
    let contentClassName = "inline-block p-3 rounded-lg ";
    
    switch (node.type) {
      case "main":
        contentClassName += "bg-primary text-primary-foreground font-bold text-xl";
        break;
      case "subtopic":
        contentClassName += "bg-secondary text-secondary-foreground font-semibold text-lg";
        break;
      case "detail":
        contentClassName += "bg-muted text-muted-foreground";
        break;
    }

    return (
      <div key={node.id} style={{ paddingLeft: `${paddingLeft}rem` }} className={nodeClassName}>
        {level > 0 && (
          <div className="absolute left-0 top-1/2 w-8 border-t border-gray-300"></div>
        )}
        {level > 0 && !isLastChild && (
          <div className="absolute left-0 top-1/2 h-full border-l border-gray-300"></div>
        )}
        <div className={contentClassName}>
          {node.label}
        </div>
        <div className="ml-4">
          {children.map((child, index) => 
            renderNode(
              child, 
              level + 1, 
              index === children.length - 1
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          onClick={() => navigate(`/course/${courseId}`)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </Button>
        <h1 className="text-3xl font-bold">Lecture Mindmap</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
          <div className="animate-pulse">Generating mindmap...</div>
        </div>
      ) : mindmapData ? (
        <div className="space-y-4 pl-8">
          {mindmapData.nodes
            .filter(node => node.parentId === null)
            .map((node, index, array) => 
              renderNode(node, 0, index === array.length - 1)
            )}
        </div>
      ) : (
        <div className="text-center py-8 text-red-500">
          Failed to generate mindmap. Please try again.
        </div>
      )}
    </div>
  );
};

export default Mindmap;
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

  const renderNode = (node: MindmapNode, level: number) => {
    const children = mindmapData?.nodes.filter(n => n.parentId === node.id) || [];
    const paddingLeft = level * 2;
    
    let className = "p-4 rounded-lg mb-2 ";
    switch (node.type) {
      case "main":
        className += "bg-primary text-primary-foreground font-bold text-xl";
        break;
      case "subtopic":
        className += "bg-secondary text-secondary-foreground font-semibold text-lg";
        break;
      case "detail":
        className += "bg-muted text-muted-foreground";
        break;
    }

    return (
      <div key={node.id} style={{ paddingLeft: `${paddingLeft}rem` }}>
        <div className={className}>
          {node.label}
        </div>
        {children.map(child => renderNode(child, level + 1))}
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
        <div className="text-center py-8">Generating mindmap...</div>
      ) : mindmapData ? (
        <div className="space-y-4">
          {mindmapData.nodes
            .filter(node => node.parentId === null)
            .map(node => renderNode(node, 0))}
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
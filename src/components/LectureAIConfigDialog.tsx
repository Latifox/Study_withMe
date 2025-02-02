import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface LectureAIConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lectureId: number;
}

const LectureAIConfigDialog = ({ isOpen, onClose, lectureId }: LectureAIConfigDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [temperature, setTemperature] = useState([0.7]);
  const [creativity, setCreativity] = useState([0.5]);
  const [detailLevel, setDetailLevel] = useState([0.6]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing configuration
  const { data: config } = useQuery({
    queryKey: ["lecture-ai-config", lectureId],
    queryFn: async () => {
      if (!lectureId) return null;
      
      const { data, error } = await supabase
        .from("lecture_ai_configs")
        .select("*")
        .eq("lecture_id", lectureId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching AI config:", error);
        throw error;
      }
      return data;
    },
    enabled: !!lectureId && isOpen, // Only fetch when we have a lectureId and dialog is open
  });

  // Update local state when config is fetched
  useEffect(() => {
    if (config) {
      setTemperature([config.temperature]);
      setCreativity([config.creativity_level]);
      setDetailLevel([config.detail_level]);
      setCustomInstructions(config.custom_instructions || "");
    }
  }, [config]);

  const handleSave = async () => {
    if (!lectureId) {
      toast({
        title: "Error",
        description: "Invalid lecture ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("lecture_ai_configs")
        .upsert({
          lecture_id: lectureId,
          temperature: temperature[0],
          creativity_level: creativity[0],
          detail_level: detailLevel[0],
          custom_instructions: customInstructions,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "AI configuration saved successfully",
      });

      // Invalidate the query to refetch the config
      queryClient.invalidateQueries({ queryKey: ["lecture-ai-config", lectureId] });
      onClose();
    } catch (error) {
      console.error("Error saving AI config:", error);
      toast({
        title: "Error",
        description: "Failed to save AI configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure AI Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground">{temperature[0]}</span>
            </div>
            <Slider
              value={temperature}
              onValueChange={setTemperature}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Controls randomness in responses. Higher values make output more creative but less focused.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Creativity Level</Label>
              <span className="text-sm text-muted-foreground">{creativity[0]}</span>
            </div>
            <Slider
              value={creativity}
              onValueChange={setCreativity}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Balances between creative and analytical responses.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Detail Level</Label>
              <span className="text-sm text-muted-foreground">{detailLevel[0]}</span>
            </div>
            <Slider
              value={detailLevel}
              onValueChange={setDetailLevel}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Controls the depth and length of AI responses.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Custom Instructions</Label>
            <Textarea
              placeholder="Add any specific instructions for how the AI should approach this lecture (e.g., 'Focus on practical examples' or 'Explain concepts as if teaching to beginners')"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-sm text-muted-foreground">
              These instructions will be applied whenever you interact with AI for this lecture.
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LectureAIConfigDialog;
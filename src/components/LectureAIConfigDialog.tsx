
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { recreateLecture } from "@/utils/lectureContentUtils";
import AIConfigSliders from "./AIConfigSliders";
import AIConfigInputs from "./AIConfigInputs";

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
  const [contentLanguage, setContentLanguage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch existing configuration
  const { data: config } = useQuery({
    queryKey: ["lecture-ai-config", lectureId],
    queryFn: async () => {
      if (!lectureId) return null;
      
      const { data: configData, error: configError } = await supabase
        .from('lecture_ai_configs')
        .select('*')
        .eq('lecture_id', lectureId)
        .maybeSingle();

      if (configError) throw configError;
      return configData;
    },
    enabled: !!lectureId && isOpen,
  });

  useEffect(() => {
    if (config) {
      setTemperature([config.temperature]);
      setCreativity([config.creativity_level]);
      setDetailLevel([config.detail_level]);
      setCustomInstructions(config.custom_instructions || "");
      setContentLanguage(config.content_language || "");
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
      setIsGenerating(true);
      console.log('Starting lecture recreation process...');

      // Create a new lecture with the updated AI config
      const newLectureId = await recreateLecture(lectureId, {
        temperature: temperature[0],
        creativity_level: creativity[0],
        detail_level: detailLevel[0],
        content_language: contentLanguage,
        custom_instructions: customInstructions,
      });

      console.log('Lecture recreation completed successfully');

      // Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ["lectures"] });
      await queryClient.invalidateQueries({ queryKey: ["segment-content"] });

      toast({
        title: "Success",
        description: "AI configuration saved and content regenerated successfully",
      });

      onClose();
    } catch (error) {
      console.error("Error in handleSave:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration and regenerate content",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900/95 backdrop-blur-md border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Configure AI Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <AIConfigSliders
            temperature={temperature}
            setTemperature={setTemperature}
            creativity={creativity}
            setCreativity={setCreativity}
            detailLevel={detailLevel}
            setDetailLevel={setDetailLevel}
          />

          <AIConfigInputs
            customInstructions={customInstructions}
            setCustomInstructions={setCustomInstructions}
            contentLanguage={contentLanguage}
            setContentLanguage={setContentLanguage}
          />

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="bg-transparent text-white border-slate-700 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || isGenerating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? "Saving..." : isGenerating ? "Regenerating Content..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LectureAIConfigDialog;

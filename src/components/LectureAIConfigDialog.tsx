
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
import { deleteExistingContent } from "@/utils/lectureContentUtils";
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

      // First get the lecture content
      const { data: lecture, error: lectureError } = await supabase
        .from('lectures')
        .select('content, title')
        .eq('id', lectureId)
        .maybeSingle();

      if (lectureError) {
        console.error('Error fetching lecture:', lectureError);
        throw lectureError;
      }
      
      if (!lecture) {
        throw new Error('Lecture not found');
      }

      // Save AI configuration
      console.log('Updating AI configuration...');
      const { error: configError } = await supabase
        .from('lecture_ai_configs')
        .upsert(
          {
            lecture_id: lectureId,
            temperature: temperature[0],
            creativity_level: creativity[0],
            detail_level: detailLevel[0],
            custom_instructions: customInstructions,
            content_language: contentLanguage,
          }
        );

      if (configError) {
        console.error('Error updating AI config:', configError);
        throw configError;
      }

      // Wait for configuration to be saved
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Delete existing content
      await deleteExistingContent(lectureId);

      // Wait for deletions to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate new segments structure
      console.log('Generating new segments structure...');
      const { error: segmentError } = await supabase.functions.invoke(
        'generate-segments-structure',
        {
          body: {
            lectureId,
            lectureContent: lecture.content,
            lectureTitle: lecture.title
          }
        }
      );

      if (segmentError) {
        console.error('Error generating segments:', segmentError);
        throw segmentError;
      }

      // Wait for segments to be created
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fetch the new segments
      const { data: segments, error: fetchError } = await supabase
        .from('lecture_segments')
        .select('*')
        .eq('lecture_id', lectureId);

      if (fetchError) {
        console.error('Error fetching segments:', fetchError);
        throw fetchError;
      }

      if (!segments || segments.length === 0) {
        throw new Error('No segments were created');
      }

      console.log(`Found ${segments.length} segments, generating content...`);

      // Generate content for each segment
      for (const segment of segments) {
        console.log(`Generating content for segment ${segment.sequence_number}...`);
        const { error: contentError } = await supabase.functions.invoke(
          'generate-segment-content',
          {
            body: {
              lectureId,
              segmentNumber: segment.sequence_number,
              segmentTitle: segment.title,
              segmentDescription: segment.segment_description,
              lectureContent: lecture.content
            }
          }
        );

        if (contentError) {
          console.error(
            `Error generating content for segment ${segment.sequence_number}:`,
            contentError
          );
          throw contentError;
        }

        // Wait between segments
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ["lecture-ai-config", lectureId] });
      await queryClient.invalidateQueries({ queryKey: ["segment-content", lectureId] });

      console.log('Content regeneration completed successfully');
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
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? "Regenerating Content..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LectureAIConfigDialog;


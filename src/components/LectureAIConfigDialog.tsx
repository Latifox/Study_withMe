
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const [contentLanguage, setContentLanguage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: config } = useQuery({
    queryKey: ["lecture-ai-config", lectureId],
    queryFn: async () => {
      if (!lectureId) return null;
      
      const { data: configData, error: configError } = await supabase
        .from("lecture_ai_configs")
        .select("*")
        .eq("lecture_id", lectureId)
        .maybeSingle();

      if (configError) throw configError;

      return { config: configData };
    },
    enabled: !!lectureId && isOpen,
  });

  useEffect(() => {
    if (config?.config) {
      setTemperature([config.config.temperature]);
      setCreativity([config.config.creativity_level]);
      setDetailLevel([config.config.detail_level]);
      setCustomInstructions(config.config.custom_instructions || "");
      setContentLanguage(config.config.content_language || "");
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

      // Update AI configuration
      const { error: configError } = await supabase
        .from("lecture_ai_configs")
        .upsert(
          {
            lecture_id: lectureId,
            temperature: temperature[0],
            creativity_level: creativity[0],
            detail_level: detailLevel[0],
            custom_instructions: customInstructions,
            content_language: contentLanguage,
          },
          {
            onConflict: 'lecture_id'
          }
        );

      if (configError) throw configError;

      // First get the lecture content
      const { data: lecture, error: lectureError } = await supabase
        .from('lectures')
        .select('content, title')
        .eq('id', lectureId)
        .single();

      if (lectureError) throw lectureError;

      // Regenerate segments structure
      console.log('Regenerating segments structure...');
      const { error: segmentError } = await supabase.functions.invoke('generate-segments-structure', {
        body: {
          lectureId,
          lectureContent: lecture.content,
          lectureTitle: lecture.title
        }
      });

      if (segmentError) throw segmentError;

      // Wait for segments to be created
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Fetch the new segments
      const { data: segments, error: fetchError } = await supabase
        .from('lecture_segments')
        .select('*')
        .eq('lecture_id', lectureId);

      if (fetchError) throw fetchError;

      console.log('Regenerating content for segments:', segments);

      // Generate content for each segment sequentially
      for (const segment of segments) {
        console.log('Generating content for segment:', segment.sequence_number);
        const { error: contentError } = await supabase.functions.invoke('generate-segment-content', {
          body: {
            lectureId,
            segmentNumber: segment.sequence_number,
            segmentTitle: segment.title,
            segmentDescription: segment.segment_description,
            lectureContent: lecture.content
          }
        });

        if (contentError) {
          console.error('Error generating content for segment:', segment.sequence_number, contentError);
          throw contentError;
        }

        // Wait between segments to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ["lecture-ai-config", lectureId] });
      await queryClient.invalidateQueries({ queryKey: ["segment-content", lectureId] });

      toast({
        title: "Success",
        description: "AI configuration saved and content regenerated successfully",
      });

      onClose();
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast({
        title: "Error",
        description: "Failed to save configuration and regenerate content",
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
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-white">Temperature</Label>
              <span className="text-sm text-white/80">{temperature[0]}</span>
            </div>
            <Slider
              value={temperature}
              onValueChange={setTemperature}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-sm text-white/70">
              Controls randomness in responses. Higher values make output more creative but less focused.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-white">Creativity Level</Label>
              <span className="text-sm text-white/80">{creativity[0]}</span>
            </div>
            <Slider
              value={creativity}
              onValueChange={setCreativity}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-sm text-white/70">
              Balances between creative and analytical responses.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-white">Detail Level</Label>
              <span className="text-sm text-white/80">{detailLevel[0]}</span>
            </div>
            <Slider
              value={detailLevel}
              onValueChange={setDetailLevel}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-sm text-white/70">
              Controls the depth and length of AI responses.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Custom Instructions</Label>
            <Textarea
              placeholder="Enter any specific instructions or requirements for content generation"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="min-h-[100px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
            />
            <p className="text-sm text-white/70">
              Specify any particular focus areas or special requirements for the content generation.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Content Language (Optional)</Label>
            <Input
              placeholder="Enter target language (e.g., English, Spanish, French)"
              value={contentLanguage}
              onChange={(e) => setContentLanguage(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
            />
            <p className="text-sm text-white/70">
              Leave empty to use the original lecture language.
            </p>
          </div>

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


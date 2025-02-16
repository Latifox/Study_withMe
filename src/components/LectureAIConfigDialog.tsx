
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LectureAIConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lectureId: number;
  currentConfig: {
    temperature: number;
    creativity_level: number;
    detail_level: number;
    custom_instructions?: string;
    content_language?: string;
  };
}

const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" }
];

const LectureAIConfigDialog = ({ 
  isOpen, 
  onClose, 
  lectureId, 
  currentConfig 
}: LectureAIConfigDialogProps) => {
  const [temperature, setTemperature] = useState(currentConfig.temperature);
  const [creativityLevel, setCreativityLevel] = useState(currentConfig.creativity_level);
  const [detailLevel, setDetailLevel] = useState(currentConfig.detail_level);
  const [customInstructions, setCustomInstructions] = useState(currentConfig.custom_instructions || "");
  const [language, setLanguage] = useState(currentConfig.content_language || "");
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('lecture_ai_configs')
        .upsert({
          lecture_id: lectureId,
          temperature,
          creativity_level: creativityLevel,
          detail_level: detailLevel,
          custom_instructions: customInstructions || null,
          content_language: language || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "AI configuration updated successfully",
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update AI configuration: " + error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure AI Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Temperature ({temperature})</Label>
            <Slider
              value={[temperature]}
              onValueChange={(value) => setTemperature(value[0])}
              min={0}
              max={1}
              step={0.1}
            />
          </div>
          <div className="grid gap-2">
            <Label>Creativity Level ({creativityLevel})</Label>
            <Slider
              value={[creativityLevel]}
              onValueChange={(value) => setCreativityLevel(value[0])}
              min={0}
              max={1}
              step={0.1}
            />
          </div>
          <div className="grid gap-2">
            <Label>Detail Level ({detailLevel})</Label>
            <Slider
              value={[detailLevel]}
              onValueChange={(value) => setDetailLevel(value[0])}
              min={0}
              max={1}
              step={0.1}
            />
          </div>
          <div className="grid gap-2">
            <Label>Content Language</Label>
            <Select 
              value={language} 
              onValueChange={setLanguage}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language (or auto-detect)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto-detect from content</SelectItem>
                {languages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Custom Instructions (Optional)</Label>
            <Textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Add any custom instructions for the AI..."
              className="h-24"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LectureAIConfigDialog;

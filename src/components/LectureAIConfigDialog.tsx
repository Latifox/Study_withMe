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
import { Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Subject {
  title: string;
  details: string;
}

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
  const [subjects, setSubjects] = useState<Subject[]>([]);
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
    enabled: !!lectureId && isOpen,
  });

  // Update local state when config is fetched
  useEffect(() => {
    if (config) {
      setTemperature([config.temperature]);
      setCreativity([config.creativity_level]);
      setDetailLevel([config.detail_level]);
      try {
        const parsedSubjects = JSON.parse(config.custom_instructions || '[]');
        setSubjects(parsedSubjects);
      } catch (e) {
        setSubjects([]);
      }
    }
  }, [config]);

  const handleAddSubject = () => {
    setSubjects([...subjects, { title: "", details: "" }]);
  };

  const handleRemoveSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (index: number, field: keyof Subject, value: string) => {
    const newSubjects = [...subjects];
    newSubjects[index][field] = value;
    setSubjects(newSubjects);
  };

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
        .upsert(
          {
            lecture_id: lectureId,
            temperature: temperature[0],
            creativity_level: creativity[0],
            detail_level: detailLevel[0],
            custom_instructions: JSON.stringify(subjects),
          },
          {
            onConflict: 'lecture_id',
            ignoreDuplicates: false
          }
        );

      if (error) throw error;

      toast({
        title: "Success",
        description: "AI configuration saved successfully",
      });

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
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
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

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Chronological Order of Subjects</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleAddSubject}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Subject
              </Button>
            </div>
            
            <div className="space-y-4">
              {subjects.map((subject, index) => (
                <div key={index} className="space-y-2 p-4 border rounded-lg relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSubject(index)}
                    className="absolute right-2 top-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  
                  <div className="space-y-2">
                    <Label>Subject {index + 1}</Label>
                    <Input
                      placeholder="Enter subject name"
                      value={subject.title}
                      onChange={(e) => handleSubjectChange(index, "title", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Details</Label>
                    <Input
                      placeholder="Add details about this subject"
                      value={subject.details}
                      onChange={(e) => handleSubjectChange(index, "details", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
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
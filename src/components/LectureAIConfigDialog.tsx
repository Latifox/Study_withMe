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
import { useState } from "react";

interface LectureAIConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lectureId: number;
}

const LectureAIConfigDialog = ({ isOpen, onClose, lectureId }: LectureAIConfigDialogProps) => {
  const [temperature, setTemperature] = useState([0.7]);
  const [creativity, setCreativity] = useState([0.5]);
  const [detailLevel, setDetailLevel] = useState([0.6]);

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

          <Button onClick={onClose} className="w-full">
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LectureAIConfigDialog;
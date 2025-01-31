import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LectureActionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lectureId: number;
}

const LectureActionsDialog = ({ isOpen, onClose, lectureId }: LectureActionsDialogProps) => {
  const navigate = useNavigate();

  const handleChatAction = () => {
    navigate(`/lecture/${lectureId}`);
    onClose();
  };

  const handleSummaryAction = () => {
    navigate(`/lecture/${lectureId}?action=summary`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lecture Actions</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button
            onClick={handleChatAction}
            className="flex items-center gap-2 w-full"
            size="lg"
          >
            <MessageSquare className="w-5 h-5" />
            Chat with your lecture
          </Button>
          <Button
            onClick={handleSummaryAction}
            className="flex items-center gap-2 w-full"
            size="lg"
          >
            <FileText className="w-5 h-5" />
            Get Lecture Summary
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LectureActionsDialog;
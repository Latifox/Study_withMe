import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, FileText, HelpCircle, BookOpen, Network, Link } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

interface LectureActionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lectureId: number;
}

const LectureActionsDialog = ({ isOpen, onClose, lectureId }: LectureActionsDialogProps) => {
  const navigate = useNavigate();
  const { courseId } = useParams();

  const handleChatAction = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/chat`);
    onClose();
  };

  const handleSummaryAction = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/summary`);
    onClose();
  };

  const handleQuizAction = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/quiz`);
    onClose();
  };

  const handleFlashcardsAction = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/flashcards`);
    onClose();
  };

  const handleMindmapAction = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/mindmap`);
    onClose();
  };

  const handleResourcesAction = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/resources`);
    onClose();
  };

  const handleStoryModeAction = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/story`);
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
            onClick={handleMindmapAction}
            className="flex items-center gap-2 w-full"
            size="lg"
          >
            <Network className="w-5 h-5" />
            Study plan
          </Button>
          <Button
            onClick={handleChatAction}
            className="flex items-center gap-2 w-full"
            size="lg"
          >
            <MessageSquare className="w-5 h-5" />
            Chat
          </Button>
          <Button
            onClick={handleSummaryAction}
            className="flex items-center gap-2 w-full"
            size="lg"
          >
            <FileText className="w-5 h-5" />
            Highlights
          </Button>
          <Button
            onClick={handleFlashcardsAction}
            className="flex items-center gap-2 w-full"
            size="lg"
          >
            <FileText className="w-5 h-5" />
            Flashcards
          </Button>
          <Button
            onClick={handleQuizAction}
            className="flex items-center gap-2 w-full"
            size="lg"
          >
            <HelpCircle className="w-5 h-5" />
            Quiz
          </Button>
          <Button
            onClick={handleResourcesAction}
            className="flex items-center gap-2 w-full"
            size="lg"
          >
            <Link className="w-5 h-5" />
            Additional Resources
          </Button>
          <Button
            onClick={handleStoryModeAction}
            className="flex items-center gap-2 w-full"
            size="lg"
          >
            <BookOpen className="w-5 h-5" />
            Story Mode
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LectureActionsDialog;
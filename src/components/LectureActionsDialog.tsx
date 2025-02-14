
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, FileText, HelpCircle, BookOpen, Network, Link, Activity } from "lucide-react";
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
      <DialogContent className="sm:max-w-md border-none bg-white/10 backdrop-blur-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white text-center">Lecture Actions</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <Button
            onClick={handleMindmapAction}
            className="flex items-center gap-3 w-full bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all duration-300 hover:scale-[1.02]"
            size="lg"
          >
            <Network className="w-5 h-5" />
            Study plan
          </Button>
          <Button
            onClick={handleStoryModeAction}
            className="flex items-center gap-3 w-full bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all duration-300 hover:scale-[1.02]"
            size="lg"
          >
            <BookOpen className="w-5 h-5" />
            Story Mode
          </Button>
          <Button
            onClick={handleSummaryAction}
            className="flex items-center gap-3 w-full bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all duration-300 hover:scale-[1.02]"
            size="lg"
          >
            <FileText className="w-5 h-5" />
            Highlights
          </Button>
          <Button
            onClick={handleChatAction}
            className="flex items-center gap-3 w-full bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all duration-300 hover:scale-[1.02]"
            size="lg"
          >
            <MessageSquare className="w-5 h-5" />
            Chat
          </Button>
          <Button
            onClick={handleFlashcardsAction}
            className="flex items-center gap-3 w-full bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all duration-300 hover:scale-[1.02]"
            size="lg"
          >
            <Activity className="w-5 h-5" />
            Flashcards
          </Button>
          <Button
            onClick={handleQuizAction}
            className="flex items-center gap-3 w-full bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all duration-300 hover:scale-[1.02]"
            size="lg"
          >
            <HelpCircle className="w-5 h-5" />
            Quiz
          </Button>
          <Button
            onClick={handleResourcesAction}
            className="flex items-center gap-3 w-full bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all duration-300 hover:scale-[1.02]"
            size="lg"
          >
            <Link className="w-5 h-5" />
            Additional Resources
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LectureActionsDialog;

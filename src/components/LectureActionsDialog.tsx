
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, FileText, HelpCircle, BookOpen, Network, Link, Activity, BrainCircuit, Mic } from "lucide-react";
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

  const handleHighlightsAction = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/highlights`);
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

  const handleStudyPlanAction = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/study-plan`);
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

  const handleMindmapAction = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/mindmap`);
    onClose();
  };

  const handlePodcastAction = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/podcast`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-none bg-white/15 backdrop-blur-xl shadow-[0_0_30px_10px_rgba(0,0,0,0.3)] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-white text-center bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/80">
            Lecture Actions
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-6">
          <Button
            onClick={handleStudyPlanAction}
            className="flex items-center gap-3 w-full bg-white/15 hover:bg-white/25 text-white border-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg shadow-md"
            size="lg"
          >
            <Network className="w-5 h-5" />
            Study plan
          </Button>
          <Button
            onClick={handleStoryModeAction}
            className="flex items-center gap-3 w-full bg-white/15 hover:bg-white/25 text-white border-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg shadow-md"
            size="lg"
          >
            <BookOpen className="w-5 h-5" />
            Story Mode
          </Button>
          <Button
            onClick={handleHighlightsAction}
            className="flex items-center gap-3 w-full bg-white/15 hover:bg-white/25 text-white border-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg shadow-md"
            size="lg"
          >
            <FileText className="w-5 h-5" />
            Highlights
          </Button>
          <Button
            onClick={handleChatAction}
            className="flex items-center gap-3 w-full bg-white/15 hover:bg-white/25 text-white border-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg shadow-md"
            size="lg"
          >
            <MessageSquare className="w-5 h-5" />
            Chat
          </Button>
          <Button
            onClick={handleFlashcardsAction}
            className="flex items-center gap-3 w-full bg-white/15 hover:bg-white/25 text-white border-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg shadow-md"
            size="lg"
          >
            <Activity className="w-5 h-5" />
            Flashcards
          </Button>
          <Button
            onClick={handleQuizAction}
            className="flex items-center gap-3 w-full bg-white/15 hover:bg-white/25 text-white border-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg shadow-md"
            size="lg"
          >
            <HelpCircle className="w-5 h-5" />
            Quiz
          </Button>
          <Button
            onClick={handleMindmapAction}
            className="flex items-center gap-3 w-full bg-white/15 hover:bg-white/25 text-white border-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg shadow-md"
            size="lg"
          >
            <BrainCircuit className="w-5 h-5" />
            Mindmap
          </Button>
          <Button
            onClick={handlePodcastAction}
            className="flex items-center gap-3 w-full bg-white/15 hover:bg-white/25 text-white border-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg shadow-md"
            size="lg"
          >
            <Mic className="w-5 h-5" />
            Podcast
          </Button>
          <Button
            onClick={handleResourcesAction}
            className="flex items-center gap-3 w-full bg-white/15 hover:bg-white/25 text-white border-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg shadow-md"
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

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface StoryFailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
  courseId: string;
  score: number;
}

const StoryFailDialog = ({
  isOpen,
  onClose,
  onRestart,
  courseId,
  score,
}: StoryFailDialogProps) => {
  const navigate = useNavigate();

  const handleBackToCourse = () => {
    navigate(`/course/${courseId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keep practicing!</DialogTitle>
          <DialogDescription>
            You need 10 XP to complete this node. Current score: {score} XP.
            Would you like to try again or return to the course?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleBackToCourse}>
            Back to Course
          </Button>
          <Button onClick={onRestart}>
            Try Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StoryFailDialog;
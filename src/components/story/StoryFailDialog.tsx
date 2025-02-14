
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
  hasFailedQuestions?: boolean;
}

const StoryFailDialog = ({
  isOpen,
  onClose,
  onRestart,
  courseId,
  score,
  hasFailedQuestions = false,
}: StoryFailDialogProps) => {
  const navigate = useNavigate();

  const handleBackToCourse = () => {
    navigate(`/course/${courseId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {hasFailedQuestions ? "Review Required Questions" : "Keep practicing!"}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            {hasFailedQuestions ? (
              <>
                <p>
                  You need to correctly answer all questions to complete this node.
                  Let's review the questions you missed.
                </p>
                <p>Current score: {score} XP</p>
              </>
            ) : (
              <>
                <p>
                  You need 10 XP to complete this node. Current score: {score} XP.
                </p>
                <p>
                  Would you like to try again or return to the course?
                </p>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleBackToCourse}>
            Back to Course
          </Button>
          <Button onClick={onRestart}>
            {hasFailedQuestions ? "Review Questions" : "Try Again"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StoryFailDialog;

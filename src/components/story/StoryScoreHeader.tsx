import { Trophy, Star, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface StoryScoreHeaderProps {
  currentScore: number;
  currentStep: number;
  onBack: () => void;
}

const StoryScoreHeader = ({ currentScore, currentStep, onBack }: StoryScoreHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        onClick={onBack}
        className="hover:scale-105 transition-transform"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Learning Pathway
      </Button>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400" />
          <span className="font-bold">{currentScore} XP</span>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-purple-500" />
          <span className="font-bold">{Math.floor(currentScore / 10)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-blue-500" />
          <span className="font-bold">{currentStep}/4</span>
        </div>
      </div>
    </div>
  );
};

export default StoryScoreHeader;
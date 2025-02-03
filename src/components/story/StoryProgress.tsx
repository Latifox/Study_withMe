import { Progress } from "@/components/ui/progress";

interface StoryProgressProps {
  currentPoints: number;
  maxPoints: number;
}

const StoryProgress = ({ currentPoints, maxPoints }: StoryProgressProps) => {
  const percentage = (currentPoints / maxPoints) * 100;

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Points: {currentPoints}/{maxPoints}</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};

export default StoryProgress;
import { Progress } from "@/components/ui/progress";

interface StoryProgressProps {
  currentPoints: number;
  maxPoints: number;
}

const StoryProgress = ({ currentPoints, maxPoints }: StoryProgressProps) => {
  const percentage = (currentPoints / maxPoints) * 100;
  const threshold = 75;

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Points: {currentPoints}/{maxPoints}</span>
        <span>Required: {threshold}</span>
      </div>
      <div className="relative">
        <Progress value={percentage} className="h-2" />
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-400" 
          style={{ left: `${threshold}%` }}
        />
      </div>
    </div>
  );
};

export default StoryProgress;
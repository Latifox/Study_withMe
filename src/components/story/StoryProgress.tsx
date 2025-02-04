import { Progress } from "@/components/ui/progress";

interface StoryProgressProps {
  currentPoints: number;
  maxPoints: number;
}

const StoryProgress = ({ currentPoints, maxPoints }: StoryProgressProps) => {
  // Calculate percentage based on current points
  const percentage = Math.min((currentPoints / maxPoints) * 100, 100);

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Points: {currentPoints}/{maxPoints} XP</span>
      </div>
      <Progress 
        value={percentage} 
        className="h-2"
        // Add a smooth transition effect
        style={{ transition: 'all 0.3s ease-in-out' }}
      />
    </div>
  );
};

export default StoryProgress;

import { Award, ArrowLeftCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface StoryCompletionScreenProps {
  onBack: () => void;
}

const StoryCompletionScreen = ({ onBack }: StoryCompletionScreenProps) => {
  useEffect(() => {
    // Fire confetti from the left and right edges
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Fire from the left
      confetti({
        ...defaults,
        particleCount: Math.floor(particleCount),
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });

      // Fire from the right
      confetti({
        ...defaults,
        particleCount: Math.floor(particleCount),
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <Card className="p-6 text-center space-y-6">
        <Award className="w-16 h-16 mx-auto text-yellow-400 animate-bounce" />
        <h2 className="text-2xl font-bold">🎉 Congratulations!</h2>
        <p className="text-lg text-muted-foreground">
          You've successfully completed this node with a perfect score!
        </p>
        <div className="space-y-4">
          <Button 
            onClick={onBack}
            className="gap-2 w-full"
            variant="outline"
          >
            <ArrowLeftCircle className="w-4 h-4" />
            Return to Learning Path
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default StoryCompletionScreen;

import { Award, ArrowLeftCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface StoryCompletionScreenProps {
  onBack: () => void;
}

const StoryCompletionScreen = ({ onBack }: StoryCompletionScreenProps) => {
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
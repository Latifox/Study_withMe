import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface StoryErrorProps {
  message: string;
  onBack: () => void;
}

const StoryError = ({ message, onBack }: StoryErrorProps) => (
  <Card className="p-3">
    <h2 className="text-lg font-bold text-red-600 mb-2">Error Loading Content</h2>
    <p className="text-sm text-muted-foreground mb-2">
      Failed to load story content: {message}
    </p>
    <Button onClick={onBack} variant="outline" size="sm">
      <ArrowLeft className="w-4 h-4 mr-1" />
      Back
    </Button>
  </Card>
);

export default StoryError;
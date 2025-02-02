import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface StoryHeaderProps {
  onBack: () => void;
}

const StoryHeader = ({ onBack }: StoryHeaderProps) => (
  <div className="mb-2">
    <Button
      variant="ghost"
      onClick={onBack}
      className="gap-1"
      size="sm"
    >
      <ArrowLeft className="w-3 h-3" />
      Back
    </Button>
  </div>
);

export default StoryHeader;
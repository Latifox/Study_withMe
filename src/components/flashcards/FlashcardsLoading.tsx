
import { Loader2 } from "lucide-react";
import StoryBackground from "@/components/ui/StoryBackground";

const FlashcardsLoading = () => {
  return (
    <StoryBackground>
      <div className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading flashcards...</p>
        </div>
      </div>
    </StoryBackground>
  );
};

export default FlashcardsLoading;

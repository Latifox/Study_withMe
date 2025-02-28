
import { Card } from "@/components/ui/card";
import { StoryContainer } from "@/components/story/StoryContainer";

interface StoryMainContentProps {
  content: any;
  currentStep: number;
  segmentScores: { [key: string]: number };
  onContinue: () => void;
  onCorrectAnswer: () => void;
  onWrongAnswer: () => void;
}

const StoryMainContent = ({
  content,
  currentStep,
  segmentScores,
  onContinue,
  onCorrectAnswer,
  onWrongAnswer
}: StoryMainContentProps) => {
  return (
    <Card className="relative overflow-hidden bg-transparent border-none shadow-none">
      {/* Completely transparent container */}
      <div className="relative p-8 rounded-lg">
        {/* Content container with bold text */}
        <div className="relative z-10 font-medium">
          <StoryContainer
            storyContent={content}
            currentSegment={0}
            currentStep={currentStep}
            segmentScores={segmentScores}
            onContinue={onContinue}
            onCorrectAnswer={onCorrectAnswer}
            onWrongAnswer={onWrongAnswer}
          />
        </div>
      </div>
    </Card>
  );
};

export default StoryMainContent;

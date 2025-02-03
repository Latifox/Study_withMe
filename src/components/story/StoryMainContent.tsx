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
    <Card className="p-6 shadow-lg transform hover:scale-[1.01] transition-transform duration-200 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <StoryContainer
        storyContent={content}
        currentSegment={0}
        currentStep={currentStep}
        segmentScores={segmentScores}
        onContinue={onContinue}
        onCorrectAnswer={onCorrectAnswer}
        onWrongAnswer={onWrongAnswer}
      />
    </Card>
  );
};

export default StoryMainContent;
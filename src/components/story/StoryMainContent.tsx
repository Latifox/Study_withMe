
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
    <Card className="relative overflow-hidden">
      {/* Decorative gradient border */}
      <div className="absolute inset-0 p-[2px] rounded-lg bg-gradient-to-br from-emerald-400/20 via-teal-400/20 to-emerald-400/20">
        <div className="absolute inset-0 backdrop-blur-xl rounded-lg bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-gray-900/90 dark:to-gray-800/90" />
      </div>

      {/* Main content area with enhanced styling */}
      <div className="relative p-8 shadow-lg transform hover:scale-[1.01] transition-all duration-300 rounded-lg">
        {/* Subtle animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/5 to-teal-50/5 dark:from-emerald-500/5 dark:to-teal-500/5 rounded-lg" />
        
        {/* Decorative patterns */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="study-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#study-grid)" />
          </svg>
        </div>

        {/* Content container with enhanced readability */}
        <div className="relative z-10">
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

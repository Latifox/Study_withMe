
import { Card } from "@/components/ui/card";
import TheorySlide from "../TheorySlide";
import QuizHandler from "../quiz/QuizHandler";
import SegmentProgress from "../SegmentProgress";
import StoryProgress from "../StoryProgress";
import { MAX_SCORE } from "@/utils/scoreUtils";

interface ContentDisplayProps {
  currentSegmentData: {
    id: string;
    title: string;
    slides: any[];
    questions: any[];
  };
  currentSegment: number;
  currentStep: number;
  totalSegments: number;
  currentScore: number;
  isSlide: boolean;
  slideIndex: number;
  questionIndex: number;
  lectureId: string | undefined;
  courseId: string | undefined;
  onContinue: () => void;
  onCorrectAnswer: () => void;
  onWrongAnswer: () => void;
}

const ContentDisplay = ({
  currentSegmentData,
  currentSegment,
  currentStep,
  totalSegments,
  currentScore,
  isSlide,
  slideIndex,
  questionIndex,
  lectureId,
  courseId,
  onContinue,
  onCorrectAnswer,
  onWrongAnswer
}: ContentDisplayProps) => {
  return (
    <Card className="p-2">
      <div className="mb-2">
        <SegmentProgress
          currentSegment={currentSegment}
          totalSegments={totalSegments}
          currentStep={currentStep}
          totalSteps={4}
        />
      </div>

      <div className="mb-2">
        <StoryProgress
          currentPoints={currentScore}
          maxPoints={MAX_SCORE}
        />
      </div>

      <h2 className="text-base font-bold mb-2">{currentSegmentData.title}</h2>
      
      {isSlide ? (
        <TheorySlide
          content={currentSegmentData.slides[slideIndex].content}
          onContinue={onContinue}
        />
      ) : (
        <QuizHandler
          currentSegmentData={currentSegmentData}
          questionIndex={questionIndex}
          lectureId={lectureId}
          courseId={courseId}
          currentScore={currentScore}
          onCorrectAnswer={onCorrectAnswer}
          onWrongAnswer={onWrongAnswer}
          onContinue={onContinue}
        />
      )}
    </Card>
  );
};

export default ContentDisplay;


import { Card } from "@/components/ui/card";
import TheorySlide from "../TheorySlide";
import QuizHandler from "../quiz/QuizHandler";
import SegmentProgress from "../SegmentProgress";
import StoryProgress from "../StoryProgress";
import { MAX_SCORE } from "@/utils/scoreUtils";
import { AlertCircle } from "lucide-react";

interface ContentDisplayProps {
  currentSegmentData: {
    id: string;
    title: string;
    slides: Array<{
      content: string;
    }>;
    questions: Array<{
      type: "multiple_choice" | "true_false";
      question: string;
      options?: string[];
      correctAnswer: string | boolean;
      explanation: string;
    }>;
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
  // Check if slides exist and have content for the current index
  const hasValidSlide = isSlide && 
    Array.isArray(currentSegmentData?.slides) && 
    currentSegmentData.slides[slideIndex]?.content;

  // Check if questions exist for the current index
  const hasValidQuestion = !isSlide && 
    Array.isArray(currentSegmentData?.questions) && 
    currentSegmentData.questions[questionIndex];

  console.log('Current segment data:', currentSegmentData);
  console.log('Is slide:', isSlide, 'slideIndex:', slideIndex);
  console.log('Has valid slide:', hasValidSlide);
  console.log('Has valid question:', hasValidQuestion);

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
        hasValidSlide ? (
          <TheorySlide
            content={currentSegmentData.slides[slideIndex].content}
            onContinue={onContinue}
          />
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">No Content Available</h4>
                <p className="text-sm text-amber-700">
                  The content for this slide is still being generated. Please try again in a few moments.
                </p>
              </div>
            </div>
          </div>
        )
      ) : (
        hasValidQuestion ? (
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
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">No Questions Available</h4>
                <p className="text-sm text-amber-700">
                  The questions for this segment are still being generated. Please try again in a few moments.
                </p>
              </div>
            </div>
          </div>
        )
      )}
    </Card>
  );
};

export default ContentDisplay;

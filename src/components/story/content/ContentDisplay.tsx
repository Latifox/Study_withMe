
import { Card } from "@/components/ui/card";
import TheorySlide from "../TheorySlide";
import QuizHandler from "../quiz/QuizHandler";
import SegmentProgress from "../SegmentProgress";
import { AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface ContentDisplayProps {
  currentSegmentData: {
    theory_slide_1: string;
    theory_slide_2: string;
    quiz_1_type: string;
    quiz_1_question: string;
    quiz_1_options?: string[];
    quiz_1_correct_answer: string;
    quiz_1_explanation: string;
    quiz_2_type: string;
    quiz_2_question: string;
    quiz_2_correct_answer: boolean;
    quiz_2_explanation: string;
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
  const [key, setKey] = useState(0);
  
  // Reset key when step changes to force component remount
  useEffect(() => {
    setKey(prev => prev + 1);
  }, [currentStep]);
  
  console.log('ContentDisplay - Current segment data:', currentSegmentData);
  console.log('ContentDisplay - Is slide:', isSlide, 'slideIndex:', slideIndex, 'questionIndex:', questionIndex, 'currentStep:', currentStep);

  // Get the appropriate content based on the slide index
  const currentSlideContent = isSlide 
    ? slideIndex === 0 
      ? currentSegmentData.theory_slide_1 
      : currentSegmentData.theory_slide_2
    : '';

  console.log('ContentDisplay - Current slide content:', currentSlideContent);

  // Get the appropriate question based on the question index
  const currentQuestion = !isSlide ? {
    type: questionIndex === 0 ? currentSegmentData.quiz_1_type : currentSegmentData.quiz_2_type,
    question: questionIndex === 0 ? currentSegmentData.quiz_1_question : currentSegmentData.quiz_2_question,
    options: questionIndex === 0 ? currentSegmentData.quiz_1_options : undefined,
    correctAnswer: questionIndex === 0 
      ? currentSegmentData.quiz_1_correct_answer 
      : currentSegmentData.quiz_2_correct_answer,
    explanation: questionIndex === 0 
      ? currentSegmentData.quiz_1_explanation 
      : currentSegmentData.quiz_2_explanation
  } : null;

  console.log('ContentDisplay - Current question:', currentQuestion);
  console.log('ContentDisplay - Current step (0-3):', currentStep);

  // Add logging for the correct answer handler to debug flow
  const handleCorrectAnswerWithLogging = () => {
    console.log(`ContentDisplay - handleCorrectAnswer called at step ${currentStep}`);
    onCorrectAnswer();
  };

  // Check if we have valid content for the current state
  const hasValidSlide = isSlide && Boolean(currentSlideContent?.trim());
  const hasValidQuestion = !isSlide && currentQuestion !== null;

  return (
    <Card className="p-2 bg-transparent border-none shadow-none">
      <div className="mb-2">
        <SegmentProgress
          currentSegment={currentSegment}
          totalSegments={totalSegments}
          currentStep={currentStep}
          totalSteps={4}
        />
      </div>
      
      {isSlide ? (
        hasValidSlide ? (
          <TheorySlide
            key={`slide-${key}-${slideIndex}`}
            content={currentSlideContent}
            onContinue={onContinue}
          />
        ) : (
          <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800/90">No Content Available</h4>
                <p className="text-sm text-amber-700/90">
                  The content for this slide is still being generated. Please try again in a few moments.
                </p>
              </div>
            </div>
          </div>
        )
      ) : (
        hasValidQuestion ? (
          <QuizHandler
            key={`quiz-${key}-${questionIndex}`}
            currentSegmentData={{
              id: String(currentSegment),
              questions: [currentQuestion]
            }}
            questionIndex={0}
            lectureId={lectureId}
            courseId={courseId}
            currentScore={currentScore}
            onCorrectAnswer={handleCorrectAnswerWithLogging}
            onWrongAnswer={onWrongAnswer}
            onContinue={onContinue}
          />
        ) : (
          <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800/90">No Questions Available</h4>
                <p className="text-sm text-amber-700/90">
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

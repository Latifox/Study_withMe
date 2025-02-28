
import { useParams } from "react-router-dom";
import { StoryContainer } from "./StoryContainer";

interface StoryMainContentProps {
  content: {
    segments: Array<{
      theory_slide_1: string;
      theory_slide_2: string;
      quiz_1_type: string;
      quiz_1_question: string;
      quiz_1_options?: string[];
      quiz_1_correct_answer: string;
      quiz_1_explanation: string;
      quiz_2_type: string;
      quiz_2_question: string;
      quiz_2_correct_answer: boolean | string;
      quiz_2_explanation: string;
    }>;
  };
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
  // Use the nodeId from URL params to get the current segment number
  const { nodeId } = useParams();
  const segmentNumber = nodeId ? parseInt(nodeId.split('_')[1]) : 1;

  console.log("StoryMainContent - Using segment number:", segmentNumber);

  return (
    <StoryContainer
      storyContent={content}
      currentSegment={segmentNumber}
      currentStep={currentStep}
      segmentScores={segmentScores}
      onContinue={onContinue}
      onCorrectAnswer={onCorrectAnswer}
      onWrongAnswer={onWrongAnswer}
    />
  );
};

export default StoryMainContent;

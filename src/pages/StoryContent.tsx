
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import StoryCompletionScreen from "@/components/story/StoryCompletionScreen";
import StoryLoading from "@/components/story/StoryLoading";
import StoryError from "@/components/story/StoryError";
import StoryScoreHeader from "@/components/story/StoryScoreHeader";
import StoryMainContent from "@/components/story/StoryMainContent";
import { useSegmentContent } from "@/hooks/useSegmentContent";
import { useSegmentProgress } from "@/hooks/useSegmentProgress";
import { useStoryContentHandler } from "@/components/story/StoryContentHandler";

const StoryContent = () => {
  const { courseId, lectureId, nodeId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const sequenceNumber = nodeId ? parseInt(nodeId.split('_')[1]) : null;
  const numericLectureId = lectureId ? parseInt(lectureId) : null;

  const { segmentScores, setSegmentScores } = useSegmentProgress(nodeId, numericLectureId, sequenceNumber);
  const { data: content, isLoading, error } = useSegmentContent(numericLectureId, sequenceNumber);
  
  const { handleContinue, handleCorrectAnswer, handleWrongAnswer } = useStoryContentHandler({
    nodeId,
    numericLectureId,
    sequenceNumber,
    currentStep,
    segmentScores,
    setSegmentScores,
    setCurrentStep
  });

  const handleBack = () => {
    navigate(`/course/${courseId}/lecture/${lectureId}/story/nodes`);
  };

  const currentScore = segmentScores[nodeId || ''] || 0;

  const baseLayout = (children: React.ReactNode) => (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient container */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #FEF7CD 0%, #FFFFFF 50%, #D3E4FD 100%)'
        }}
      >
        {/* Mesh grid overlay */}
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#000" strokeWidth="1" opacity="0.1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content container */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );

  if (currentStep >= 4 && currentScore >= 10) {
    return baseLayout(<StoryCompletionScreen onBack={handleBack} />);
  }

  if (isLoading) {
    return baseLayout(
      <div className="container mx-auto p-4">
        <StoryLoading />
      </div>
    );
  }

  if (error || !content) {
    return baseLayout(
      <div className="container mx-auto p-4">
        <StoryError 
          message={error instanceof Error ? error.message : "Failed to load segment content"}
          onBack={handleBack}
        />
      </div>
    );
  }

  return baseLayout(
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <StoryScoreHeader
            currentScore={currentScore}
            currentStep={currentStep}
            onBack={handleBack}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative mt-6"
        >
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20" />
          
          <div className="relative">
            <StoryMainContent
              content={content}
              currentStep={currentStep}
              segmentScores={segmentScores}
              onContinue={handleContinue}
              onCorrectAnswer={handleCorrectAnswer}
              onWrongAnswer={handleWrongAnswer}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StoryContent;

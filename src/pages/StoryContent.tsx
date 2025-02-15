
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

  // Consistent background style for all segments
  const getBackgroundStyle = () => {
    return {
      background: `linear-gradient(135deg, 
        rgba(250, 204, 21, 0.15), 
        rgba(59, 130, 246, 0.15))`
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={getBackgroundStyle()}>
        <div className="container mx-auto p-4">
          <StoryLoading />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen" style={getBackgroundStyle()}>
        <div className="container mx-auto p-4">
          <StoryError 
            message={error instanceof Error ? error.message : "Failed to load segment content"}
            onBack={handleBack}
          />
        </div>
      </div>
    );
  }

  const currentScore = segmentScores[nodeId || ''] || 0;

  if (currentStep >= 4 && currentScore >= 10) {
    return (
      <div className="min-h-screen" style={getBackgroundStyle()}>
        <StoryCompletionScreen onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Consistent pale gradient background */}
      <div 
        className="absolute inset-0 transition-colors duration-1000" 
        style={getBackgroundStyle()}
      >
        {/* Enhanced mesh pattern with better visibility */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(250, 204, 21, 0.2) 1.5px, transparent 1.5px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.2) 1.5px, transparent 1.5px)
            `,
            backgroundSize: '25px 25px',
            opacity: 0.8
          }}
        />
      </div>

      {/* Content */}
      <div className="relative p-4 sm:p-6 lg:p-8">
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
            {/* Enhanced glass effect with better transparency */}
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-lg border border-white/10" />
            
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
    </div>
  );
};

export default StoryContent;

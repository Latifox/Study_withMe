
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
        <div className="container mx-auto p-4">
          <StoryLoading />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
        <StoryCompletionScreen onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
      {/* Subtle floating shapes in the background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-[20%] w-64 h-64 rounded-full bg-emerald-200/10 dark:bg-emerald-600/5 blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            x: [0, -10, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 right-[20%] w-96 h-96 rounded-full bg-teal-200/10 dark:bg-teal-600/5 blur-3xl"
        />
      </div>

      <div className="container mx-auto p-4 space-y-6 relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <StoryScoreHeader
            currentScore={currentScore}
            currentStep={currentStep}
            onBack={handleBack}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative"
        >
          {/* Glass card effect for main content */}
          <div className="absolute inset-0 bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-lg" />
          
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

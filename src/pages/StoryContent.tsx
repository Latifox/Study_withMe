
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
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600">
        <div className="container mx-auto p-4">
          <StoryLoading />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600">
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
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600">
        <StoryCompletionScreen onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Bold animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600">
        {/* Animated mesh pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Animated orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-violet-900/50 via-transparent to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative p-8">
        <div className="max-w-6xl mx-auto">
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
            className="relative mt-8"
          >
            {/* Glass card effect for main content */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-md border-white/20 rounded-lg" />
            
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

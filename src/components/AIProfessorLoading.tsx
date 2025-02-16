
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Brain, Sparkles, BookOpen, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

const AIProfessorLoading = ({ lectureId }: { lectureId: string }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  const loadingMessages = [
    "Analyzing academic content...",
    "Building knowledge pathways...",
    "Crafting interactive elements...",
    "Preparing personalized learning journey...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-violet-600/90 via-purple-500/90 to-indigo-600/90">
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

      <div className="min-h-screen relative z-10 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 bg-white/95 backdrop-blur-md border-white/20">
          <motion.div 
            className="flex flex-col items-center justify-center space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="relative"
              >
                <GraduationCap className="h-16 w-16 text-primary" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="h-6 w-6 text-yellow-500" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                className="absolute -bottom-2 -left-2"
              >
                <Brain className="h-6 w-6 text-purple-500" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-2 -right-2"
              >
                <BookOpen className="h-6 w-6 text-blue-500" />
              </motion.div>
            </div>
            
            <div className="text-center space-y-4">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-gray-800"
              >
                Generating Learning Content
              </motion.h2>
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-gray-600"
              >
                {loadingMessages[messageIndex]}
              </motion.p>
            </div>

            <div className="flex gap-2">
              <motion.div
                animate={{ scale: [1, 0.9, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3 }}
                className="w-2 h-2 bg-purple-600 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 0.9, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3, delay: 0.2 }}
                className="w-2 h-2 bg-purple-600 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 0.9, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3, delay: 0.4 }}
                className="w-2 h-2 bg-purple-600 rounded-full"
              />
            </div>
          </motion.div>
        </Card>
      </div>
    </div>
  );
};

export default AIProfessorLoading;

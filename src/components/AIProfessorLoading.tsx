
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Brain, Sparkles, BookOpen, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

const loadingMessages = [
  "Your AI Professor is reviewing the lecture material...",
  "Analyzing academic concepts and key points...",
  "Creating personalized learning pathways...",
  "Preparing interactive study materials...",
  "Designing engaging quizzes and exercises...",
  "Crafting storytelling elements for better understanding...",
  "Brewing a cup of virtual coffee to stay sharp... ☕",
  "Polishing academic glasses for detailed review... 🤓",
  "Organizing virtual study materials...",
  "Getting excited about sharing knowledge with you! 🎓",
];

const AIProfessorLoading = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 5000); // Changed from 3000 to 5000 ms (5 seconds per message)

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <motion.div 
            className="flex flex-col items-center justify-center gap-6"
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
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center space-y-2"
            >
              <h2 className="text-2xl font-semibold text-primary">
                AI Professor at Work
              </h2>
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-muted-foreground"
              >
                {loadingMessages[messageIndex]}
              </motion.p>
            </motion.div>

            <div className="flex gap-2 mt-4">
              <motion.div
                animate={{ scale: [1, 0.9, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3 }}
                className="w-2 h-2 bg-primary rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 0.9, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3, delay: 0.2 }}
                className="w-2 h-2 bg-primary rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 0.9, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3, delay: 0.4 }}
                className="w-2 h-2 bg-primary rounded-full"
              />
            </div>
          </motion.div>
        </Card>
      </div>
    </div>
  );
};

export default AIProfessorLoading;

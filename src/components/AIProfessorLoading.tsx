
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Brain, Sparkles, BookOpen, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Segment {
  title: string;
  segment_description: string;
  sequence_number: number;
}

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

  // Fetch segments data
  const { data: segments } = useQuery({
    queryKey: ['lecture-segments', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lecture_segments')
        .select('*')
        .eq('lecture_id', parseInt(lectureId))
        .order('sequence_number');

      if (error) throw error;
      return data as Segment[];
    }
  });

  // Animation variants for the mindmap
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

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
        <Card className="w-full max-w-4xl p-8 bg-white/95 backdrop-blur-md border-white/20">
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
              className="text-center space-y-2 mb-8"
            >
              <h2 className="text-2xl font-semibold text-primary">
                Generating Learning Content
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

            {segments && segments.length > 0 && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full mt-8"
              >
                <div className="relative flex flex-wrap justify-center gap-4">
                  {segments.map((segment, index) => (
                    <motion.div
                      key={segment.sequence_number}
                      variants={itemVariants}
                      className="relative"
                      style={{
                        zIndex: segments.length - index
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl blur-xl" />
                      <div className="relative bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-purple-200 shadow-xl hover:shadow-2xl transition-shadow duration-300 max-w-xs">
                        <h3 className="font-semibold text-lg text-gray-800 mb-2">
                          {segment.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {segment.segment_description.replace(/Key concepts to explore: /g, '').split(', ').map((concept, i) => (
                            <span key={i} className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs m-1">
                              {concept}
                            </span>
                          ))}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="flex gap-2 mt-8">
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

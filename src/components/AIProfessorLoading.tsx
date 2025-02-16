
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
            className="flex flex-col items-center justify-center space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center space-y-2"
            >
              <h2 className="text-3xl font-bold text-gray-800">
                Generating Learning Content
              </h2>
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-gray-600"
              >
                {loadingMessages[messageIndex]}
              </motion.p>
            </motion.div>

            {/* Mindmap */}
            {segments && segments.length > 0 && (
              <motion.div 
                className="w-full pt-8"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.2 }
                  }
                }}
              >
                <div className="relative flex flex-wrap justify-center gap-6">
                  {segments.map((segment, index) => (
                    <motion.div
                      key={segment.sequence_number}
                      variants={{
                        hidden: { scale: 0.8, opacity: 0 },
                        visible: {
                          scale: 1,
                          opacity: 1,
                          transition: {
                            type: "spring",
                            damping: 15,
                            stiffness: 100
                          }
                        }
                      }}
                      className="relative"
                    >
                      {/* Connection lines */}
                      {index < segments.length - 1 && (
                        <div 
                          className="absolute top-1/2 -right-6 w-6 h-0.5 bg-gradient-to-r from-purple-300 to-transparent"
                          style={{ transform: 'translateY(-50%)' }}
                        />
                      )}
                      
                      {/* Segment bubble */}
                      <div className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl blur-xl transition-all duration-300 group-hover:blur-2xl" />
                        <div className="relative bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-purple-200 shadow-xl hover:shadow-2xl transition-all duration-300 max-w-xs">
                          <div className="absolute -top-3 -right-3 bg-purple-100 rounded-full p-2">
                            <span className="font-semibold text-purple-600">{index + 1}</span>
                          </div>
                          <h3 className="font-semibold text-xl text-gray-800 mb-3">
                            {segment.title}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {segment.segment_description
                              .replace(/Key concepts to explore: /g, '')
                              .split(', ')
                              .map((concept, i) => (
                                <span
                                  key={i}
                                  className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium animate-fade-in"
                                >
                                  {concept}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Loading dots */}
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

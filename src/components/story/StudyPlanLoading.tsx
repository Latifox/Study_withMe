
import { motion } from "framer-motion";
import { Network } from "lucide-react";
import { Card } from "@/components/ui/card";

const StudyPlanLoading = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600">
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
        
        <div className="absolute top-0 left-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-4"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block"
            >
              <Network className="w-12 h-12 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white">Creating Your Study Plan</h2>
            <p className="text-white/80">Analyzing content and designing your learning journey...</p>
          </motion.div>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6">
            <div className="space-y-3">
              <div className="h-6 bg-white/20 rounded-full w-1/3 animate-pulse" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-6 bg-white/10 rounded-full w-24 animate-pulse"
                  />
                ))}
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card 
                key={i}
                className="bg-white/10 backdrop-blur-md border-white/20 p-6"
              >
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse" />
                  <div className="flex-1 space-y-4">
                    <div className="h-6 bg-white/20 rounded w-1/3 animate-pulse" />
                    <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
                    <div className="flex gap-2">
                      {[1, 2].map((j) => (
                        <div
                          key={j}
                          className="h-8 bg-white/10 rounded w-24 animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <motion.div 
            className="flex justify-center gap-2"
            animate={{ 
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white" />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StudyPlanLoading;

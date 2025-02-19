
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

const HighlightsLoading = () => {
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
      <div className="relative">
        <div className="container mx-auto p-4 space-y-8">
          {/* Animated Loading Message */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-4 mb-8"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block"
            >
              <FileText className="w-12 h-12 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white">Generating Lecture Highlights</h2>
            <p className="text-white/80">Analyzing content and extracting key insights...</p>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Column */}
            <div className="w-full md:w-1/3 space-y-4">
              <Card className="bg-white/20 backdrop-blur-sm border border-white/30">
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                    <div className="h-6 bg-white/10 rounded w-3/4 animate-pulse" />
                  </div>
                </div>
              </Card>
              
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="bg-white/20 backdrop-blur-sm border border-white/30">
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
                        <div className="h-4 bg-white/10 rounded w-2/3 animate-pulse" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Right Column */}
            <div className="w-full md:w-2/3">
              <Card className="bg-white/20 backdrop-blur-sm border border-white/30 h-[80vh]">
                <div className="p-6 space-y-4">
                  <div className="h-8 bg-white/10 rounded w-1/3 animate-pulse" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-4 bg-white/10 rounded w-full animate-pulse" />
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HighlightsLoading;

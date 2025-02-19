
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

const HighlightsLoading = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient container with bolder colors */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #FFE5A3 0%, #FFFFFF 50%, #A7D1FF 100%)'
        }}
      >
        {/* Mesh grid overlay with slightly darker lines */}
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#000" strokeWidth="1" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
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
              <FileText className="w-12 h-12 text-[#6366f1]" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[#1f2937]">Generating Lecture Highlights</h2>
            <p className="text-[#4b5563]">Analyzing content and extracting key insights...</p>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Column */}
            <div className="w-full md:w-1/3 space-y-4">
              <Card className="bg-white/80 backdrop-blur-sm border border-white/50">
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
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
                  <Card className="bg-white/80 backdrop-blur-sm border border-white/50">
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
                        <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Right Column */}
            <div className="w-full md:w-2/3">
              <Card className="bg-white/80 backdrop-blur-sm border border-white/50 h-[80vh]">
                <div className="p-6 space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded w-full animate-pulse" />
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

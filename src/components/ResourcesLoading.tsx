
import { motion } from "framer-motion";
import { Network } from "lucide-react";
import { Card } from "@/components/ui/card";

const ResourcesLoading = () => {
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
            <h2 className="text-2xl font-bold text-white">Gathering Learning Resources</h2>
            <p className="text-white/80">Finding the best content to complement your learning...</p>
          </motion.div>

          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card 
                key={i}
                className="bg-white/10 backdrop-blur-md border-white/20 p-6"
              >
                <div className="space-y-4">
                  <div className="h-6 bg-white/20 rounded w-1/3 animate-pulse" />
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3].map((j) => (
                      <div
                        key={j}
                        className="h-8 bg-white/10 rounded w-24 animate-pulse"
                      />
                    ))}
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((k) => (
                      <div key={k} className="h-24 bg-white/10 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesLoading;

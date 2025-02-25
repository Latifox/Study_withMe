
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import BackgroundGradient from "@/components/ui/BackgroundGradient";

const ResourcesLoading = () => {
  return (
    <div className="space-y-8">
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
          <BookOpen className="w-12 h-12 text-black" />
        </motion.div>
        <h2 className="text-2xl font-bold text-black">Finding Learning Resources</h2>
        <p className="text-black/80">Discovering relevant educational materials...</p>
      </motion.div>

      {Array.from({ length: 2 }).map((_, index) => (
        <Card 
          key={index}
          className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden"
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="h-6 bg-black/10 rounded w-1/3 animate-pulse" />
            </div>
            
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, resourceTypeIndex) => (
                <div key={resourceTypeIndex} className="space-y-4">
                  <div className="h-4 bg-black/10 rounded w-1/4 animate-pulse" />
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, resourceIndex) => (
                      <div key={resourceIndex} className="flex space-x-3">
                        <div className="h-4 bg-black/10 rounded w-2/3 animate-pulse" />
                        <div className="h-4 bg-black/10 rounded w-1/3 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ResourcesLoading;

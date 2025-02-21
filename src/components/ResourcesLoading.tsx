
import { motion } from "framer-motion";
import { Network } from "lucide-react";
import { Card } from "@/components/ui/card";
import BackgroundGradient from "@/components/ui/BackgroundGradient";

const ResourcesLoading = () => {
  return (
    <div className="relative min-h-screen">
      <BackgroundGradient>
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
                <Network className="w-12 h-12 text-black" />
              </motion.div>
              <h2 className="text-2xl font-bold text-black">Gathering Learning Resources</h2>
              <p className="text-black/80">Finding the best content to complement your learning...</p>
            </motion.div>

            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card 
                  key={i}
                  className="bg-white/10 backdrop-blur-md border-white/20 p-6"
                >
                  <div className="space-y-4">
                    <div className="h-6 bg-black/20 rounded w-1/3 animate-pulse" />
                    <div className="flex gap-2 mb-4">
                      {[1, 2, 3].map((j) => (
                        <div
                          key={j}
                          className="h-8 bg-black/10 rounded w-24 animate-pulse"
                        />
                      ))}
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((k) => (
                        <div key={k} className="h-24 bg-black/10 rounded animate-pulse" />
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </BackgroundGradient>
    </div>
  );
};

export default ResourcesLoading;

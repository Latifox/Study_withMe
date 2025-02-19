
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import BackgroundGradient from "./ui/BackgroundGradient";

const HighlightsLoading = () => {
  return (
    <BackgroundGradient>
      <div className="container mx-auto p-4">
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
    </BackgroundGradient>
  );
};

export default HighlightsLoading;

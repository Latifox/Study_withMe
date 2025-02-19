
import { motion } from "framer-motion";
import { Brain, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

const StudyPlanLoading = () => {
  return (
    <div className="space-y-8">
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
          <Brain className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white">Creating Your Study Plan</h2>
        <p className="text-white/80">Crafting a personalized learning journey...</p>
      </motion.div>

      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.2 }}
        >
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-white/20 rounded animate-pulse w-1/3" />
                <div className="h-3 bg-white/20 rounded animate-pulse w-2/3" />
              </div>
              <ArrowRight className="w-6 h-6 text-white/40" />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default StudyPlanLoading;

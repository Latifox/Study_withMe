
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
          <Brain className="w-12 h-12 text-emerald-500" />
        </motion.div>
        <h2 className="text-2xl font-bold text-emerald-500">Creating Your Study Plan</h2>
        <p className="text-muted-foreground">Crafting a personalized learning journey...</p>
      </motion.div>

      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-emerald-500/20 rounded animate-pulse w-1/3" />
                <div className="h-3 bg-emerald-500/20 rounded animate-pulse w-2/3" />
              </div>
              <ArrowRight className="w-6 h-6 text-emerald-500/40" />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default StudyPlanLoading;

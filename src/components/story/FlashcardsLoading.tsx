
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";

const FlashcardsLoading = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center space-y-4"
      >
        <motion.div
          animate={{ 
            rotateY: [0, 180, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="inline-block"
        >
          <Activity className="w-12 h-12 text-purple-500" />
        </motion.div>
        <h2 className="text-2xl font-bold text-purple-500">Preparing Flashcards</h2>
        <p className="text-muted-foreground">Creating your study deck...</p>
      </motion.div>

      <div className="relative h-48">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2"
            initial={{ x: "-50%", y: "-50%", rotate: (i - 2) * 5, scale: 1 - (i * 0.05) }}
            animate={{ 
              rotate: [(i - 2) * 5, (i - 2) * -5, (i - 2) * 5],
              y: ["-50%", "-55%", "-50%"]
            }}
            transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
          >
            <Card className={`w-64 h-40 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 
              ${i === 1 ? "animate-pulse" : ""}`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FlashcardsLoading;

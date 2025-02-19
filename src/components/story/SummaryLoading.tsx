
import { motion } from "framer-motion";
import { FileText, Check } from "lucide-react";
import { Card } from "@/components/ui/card";

const SummaryLoading = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
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
          <FileText className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white">Generating Summary</h2>
        <p className="text-white/80">Analyzing lecture content...</p>
      </motion.div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.2 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="flex items-center gap-4">
                <Check className="w-5 h-5 text-white/40" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/20 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-white/20 rounded animate-pulse w-1/2" />
                </div>
              </div>
            </Card>
          </motion.div>
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
  );
};

export default SummaryLoading;

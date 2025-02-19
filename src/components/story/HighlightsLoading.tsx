
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

const HighlightsLoading = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center space-y-4"
      >
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block"
        >
          <FileText className="w-12 h-12 text-blue-500" />
        </motion.div>
        <h2 className="text-2xl font-bold text-blue-500">Extracting Key Points</h2>
        <p className="text-muted-foreground">Analyzing content for important highlights...</p>
      </motion.div>

      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.2 }}
        >
          <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/20">
            <div className="space-y-2">
              <div className="h-4 bg-blue-500/20 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-blue-500/20 rounded animate-pulse w-full" />
              <div className="h-3 bg-blue-500/20 rounded animate-pulse w-2/3" />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default HighlightsLoading;

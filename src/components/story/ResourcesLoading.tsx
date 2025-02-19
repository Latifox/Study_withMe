
import { motion } from "framer-motion";
import { Network } from "lucide-react";
import { Card } from "@/components/ui/card";

const ResourcesLoading = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center space-y-4"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 360]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="inline-block"
        >
          <Network className="w-12 h-12 text-amber-500" />
        </motion.div>
        <h2 className="text-2xl font-bold text-amber-500">Gathering Resources</h2>
        <p className="text-muted-foreground">Finding relevant learning materials...</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded bg-amber-500/20 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-amber-500/20 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-amber-500/20 rounded animate-pulse w-full" />
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
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <div className="w-2 h-2 rounded-full bg-amber-500" />
      </motion.div>
    </div>
  );
};

export default ResourcesLoading;

import { Card } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const StoryLoading = () => (
  <Card className="p-8">
    <motion.div 
      className="flex flex-col items-center justify-center gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-12 w-12 text-primary" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute -top-1 -right-1"
        >
          <Sparkles className="h-4 w-4 text-yellow-500" />
        </motion.div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-2"
      >
        <p className="text-lg font-medium text-primary">
          Preparing Your Learning Experience
        </p>
        <p className="text-sm text-muted-foreground">
          We're crafting engaging content just for you...
        </p>
      </motion.div>
    </motion.div>
  </Card>
);

export default StoryLoading;
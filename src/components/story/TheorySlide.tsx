import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface TheorySlideProps {
  content: string;
  onContinue: () => void;
}

const TheorySlide = ({ content, onContinue }: TheorySlideProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-200">
        <div className="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4 text-primary" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mb-3 text-primary/90" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-xl font-medium mb-2 text-primary/80" {...props} />,
              p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
              li: ({ node, ...props }) => <li className="mb-1" {...props} />,
              code: ({ node, inline, ...props }) => 
                inline ? (
                  <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm" {...props} />
                ) : (
                  <code className="block bg-gray-100 dark:bg-gray-700 p-4 rounded-lg my-4 text-sm overflow-x-auto" {...props} />
                ),
              blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-gray-600 dark:text-gray-300" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-bold text-primary dark:text-primary/90" {...props} />
              ),
              em: ({ node, ...props }) => (
                <em className="italic text-gray-700 dark:text-gray-200" {...props} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </Card>
      
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-primary/80 to-primary hover:from-primary hover:to-primary/90 text-white shadow-md"
        >
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default TheorySlide;
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';

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
      <div className="prose prose-sm dark:prose-invert max-w-none bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onContinue}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 px-6 py-3 rounded-lg font-semibold shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
      >
        Continue
      </motion.button>
    </motion.div>
  );
};

export default TheorySlide;
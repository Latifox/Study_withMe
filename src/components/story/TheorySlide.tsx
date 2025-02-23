
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Components } from 'react-markdown';

interface TheorySlideProps {
  content: string;
  onContinue: () => void;
}

interface CodeComponentProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const TheorySlide = ({ content, onContinue }: TheorySlideProps) => {
  // Clean up any special sections and process Markdown content
  const cleanContent = content.replace(/Did you know\?.*?(?=\n\n|\n$|$)/gs, '');
  
  // Process mathematical notations and preserve Markdown formatting
  const processedContent = cleanContent
    .replace(/\[ /g, '$$')
    .replace(/ \]/g, '$$')
    .replace(/\(\\omega\)/g, '$\\omega$')
    .replace(/\(\\[a-zA-Z]+\)/g, (match) => {
      return '$' + match.slice(1, -1) + '$';
    });

  const handleContinue = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onContinue();
    }, 300);
  };

  // Custom components for ReactMarkdown with improved styling
  const customComponents: Components = {
    h1: ({ node, ...props }) => (
      <h1 className="text-3xl font-bold mb-6 text-gray-900 border-b pb-2" {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 className="text-2xl font-semibold mb-4 text-gray-800 mt-8" {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="text-xl font-medium mb-3 text-gray-800 mt-6" {...props} />
    ),
    p: ({ node, children, ...props }) => (
      <p className="mb-4 text-gray-700 leading-relaxed text-lg whitespace-pre-wrap" {...props}>
        {children}
      </p>
    ),
    ul: ({ node, ...props }) => (
      <ul className="my-4 space-y-2 list-disc pl-6 marker:text-blue-500" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="my-4 space-y-2 list-decimal pl-6 marker:text-blue-500" {...props} />
    ),
    li: ({ node, ...props }) => (
      <li className="text-gray-700 leading-relaxed text-lg pl-2" {...props} />
    ),
    strong: ({ node, ...props }) => (
      <strong className="font-semibold text-gray-900 bg-yellow-50 px-1 rounded" {...props} />
    ),
    em: ({ node, ...props }) => (
      <em className="text-gray-800 italic" {...props} />
    ),
    code: ({ inline, className, children, ...props }: CodeComponentProps) => {
      if (inline) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-gray-100 text-sm font-mono text-gray-800" {...props}>
            {children}
          </code>
        );
      }
      return (
        <div className="relative">
          <pre className="overflow-x-auto p-4 rounded-lg bg-gray-100 border border-gray-200">
            <code className="text-sm font-mono text-gray-800" {...props}>
              {children}
            </code>
          </pre>
        </div>
      );
    },
    blockquote: ({ node, ...props }) => (
      <blockquote 
        className="border-l-4 border-blue-200 pl-4 my-4 italic text-gray-700 bg-blue-50 p-4 rounded-r"
        {...props}
      />
    )
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Card className="relative overflow-hidden bg-white/95 backdrop-blur-md border-white/20 shadow-lg">
        <div className="relative p-8">
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={customComponents}
            >
              {processedContent}
            </ReactMarkdown>
          </div>
        </div>
      </Card>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="sticky bottom-4"
      >
        <Button
          onClick={handleContinue}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white backdrop-blur-sm border-2 border-blue-500/40 shadow-lg hover:shadow-xl transition-all duration-300 py-6 text-lg font-medium rounded-xl"
        >
          Continue
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default TheorySlide;

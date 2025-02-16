
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface TheorySlideProps {
  content: string;
  onContinue: () => void;
}

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const TheorySlide = ({ content, onContinue }: TheorySlideProps) => {
  const createMotionComponent = (Component: keyof JSX.IntrinsicElements) => {
    return motion[Component];
  };

  const MotionH1 = createMotionComponent('h1');
  const MotionH2 = createMotionComponent('h2');
  const MotionH3 = createMotionComponent('h3');
  const MotionP = createMotionComponent('p');
  const MotionUl = createMotionComponent('ul');
  const MotionOl = createMotionComponent('ol');
  const MotionLi = createMotionComponent('li');
  const MotionBlockquote = createMotionComponent('blockquote');

  // Process the content to ensure LaTeX equations and symbols are properly formatted
  const processedContent = content
    .replace(/\[ /g, '$$')
    .replace(/ \]/g, '$$')
    .replace(/\(\\omega\)/g, '$\\omega$')
    .replace(/\(\\[a-zA-Z]+\)/g, (match) => {
      // Convert any LaTeX command in parentheses to inline math mode
      return '$' + match.slice(1, -1) + '$';
    });

  const handleContinue = () => {
    // Scroll to top before triggering the continue action
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Wait for the scroll to complete before continuing
    setTimeout(() => {
      onContinue();
    }, 300); // Adjust timeout if needed to match scroll duration
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <Card className="relative overflow-hidden bg-white/20 backdrop-blur-md border-white/20">
        <div className="relative p-6">
          <div className="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1 
                    className="text-3xl font-bold mb-4 text-gray-900"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    className="text-2xl font-semibold mb-3 text-gray-900"
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    className="text-xl font-medium mb-2 text-gray-900"
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p
                    className="mb-4 leading-relaxed text-gray-800"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    className="list-disc pl-6 mb-4 space-y-2 marker:text-gray-700"
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    className="list-decimal pl-6 mb-4 space-y-2 marker:text-gray-700"
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li
                    className="mb-1 text-gray-800"
                    {...props}
                  />
                ),
                code: ({ node, inline, className, children, ...props }: CodeProps) => 
                  inline ? (
                    <code className="bg-black/10 px-1.5 py-0.5 rounded text-sm font-mono text-gray-900" {...props}>
                      {children}
                    </code>
                  ) : (
                    <div className="relative">
                      <pre className="overflow-x-auto p-4 rounded-lg bg-black/10 border border-black/20">
                        <code className="text-sm font-mono text-gray-900" {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  ),
                blockquote: ({ node, ...props }) => (
                  <blockquote 
                    className="border-l-4 border-gray-400/50 pl-4 my-4 italic text-gray-700"
                    {...props}
                  />
                )
              }}
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
          className="w-full bg-blue-600/90 hover:bg-blue-700/95 text-white backdrop-blur-sm border-2 border-blue-500/40 shadow-lg hover:shadow-xl transition-all duration-300 py-6 text-lg font-medium"
        >
          Continue
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default TheorySlide;

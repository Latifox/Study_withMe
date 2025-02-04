
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5 opacity-50" />
        
        <div className="relative p-8 backdrop-blur-sm">
          <div className="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                h1: ({ node, ...props }) => (
                  <MotionH1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <MotionH2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl font-semibold mb-4 text-primary/90"
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <MotionH3
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl font-medium mb-3 text-primary/80"
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <MotionP
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mb-4 leading-relaxed text-foreground/90 [&>*]:text-foreground/90"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <MotionUl
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="list-disc pl-6 mb-4 space-y-2 marker:text-primary"
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <MotionOl
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="list-decimal pl-6 mb-4 space-y-2 marker:text-primary"
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <MotionLi
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mb-1"
                    {...props}
                  />
                ),
                code: ({ node, inline, className, children, ...props }: CodeProps) => 
                  inline ? (
                    <code className="bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 rounded text-sm font-mono text-primary" {...props}>
                      {children}
                    </code>
                  ) : (
                    <div className="relative group">
                      <pre className="overflow-x-auto p-4 rounded-lg bg-primary/5 dark:bg-primary/10 border border-primary/10">
                        <code className="text-sm font-mono text-primary/90" {...props}>
                          {children}
                        </code>
                      </pre>
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ),
                blockquote: ({ node, ...props }) => (
                  <MotionBlockquote 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="border-l-4 border-primary/50 pl-4 my-6 italic text-foreground/80"
                    {...props}
                  />
                )
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </Card>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="sticky bottom-4"
      >
        <Button
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Continue
          <ChevronRight className="ml-2 h-4 w-4 animate-pulse" />
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default TheorySlide;


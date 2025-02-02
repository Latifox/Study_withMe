import ReactMarkdown from 'react-markdown';

interface TheorySlideProps {
  content: string;
  onContinue: () => void;
}

const TheorySlide = ({ content, onContinue }: TheorySlideProps) => {
  return (
    <div className="space-y-3">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
      <button
        onClick={onContinue}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg text-sm"
      >
        Continue
      </button>
    </div>
  );
};

export default TheorySlide;
import ReactMarkdown from 'react-markdown';

interface TheorySlideProps {
  content: string;
  onContinue: () => void;
}

const TheorySlide = ({ content, onContinue }: TheorySlideProps) => {
  return (
    <div className="space-y-6">
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
      <button
        onClick={onContinue}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg"
      >
        Continue
      </button>
    </div>
  );
};

export default TheorySlide;
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  type: "true_false" | "multiple_choice";
  question: string;
  options?: string[];
  correctAnswer: string | boolean;
  explanation: string;
}

interface StoryQuizProps {
  question: QuizQuestion;
  onCorrectAnswer: () => void;
  onWrongAnswer: () => void;
}

const StoryQuiz = ({ question, onCorrectAnswer, onWrongAnswer }: StoryQuizProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!selectedAnswer || hasSubmitted) return;

    const isCorrect = 
      question.type === "true_false" 
        ? selectedAnswer === question.correctAnswer.toString()
        : selectedAnswer === question.correctAnswer;

    setHasSubmitted(true);

    if (isCorrect) {
      toast({
        title: "Correct!",
        description: "Great job! Let's continue with the story.",
      });
      onCorrectAnswer();
    } else {
      toast({
        title: "Incorrect",
        description: question.explanation,
        variant: "destructive",
      });
      onWrongAnswer();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">{question.question}</h3>
      
      <RadioGroup
        value={selectedAnswer || ""}
        onValueChange={setSelectedAnswer}
        className="space-y-2"
        disabled={hasSubmitted}
      >
        {question.type === "true_false" ? (
          <>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="true" />
              <label htmlFor="true">True</label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="false" />
              <label htmlFor="false">False</label>
            </div>
          </>
        ) : (
          question.options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={option} />
              <label htmlFor={option}>{option}</label>
            </div>
          ))
        )}
      </RadioGroup>

      <button
        onClick={handleSubmit}
        disabled={!selectedAnswer || hasSubmitted}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 px-3 py-1.5 rounded-lg text-sm"
      >
        Submit Answer
      </button>
    </div>
  );
};

export default StoryQuiz;
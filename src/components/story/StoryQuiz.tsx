
import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

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
  isAnswered: boolean;
}

const StoryQuiz = ({ question, onCorrectAnswer, onWrongAnswer, isAnswered }: StoryQuizProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setHasSubmitted(false);
    setIsCorrect(null);
  }, [question]);

  const handleSubmit = () => {
    if (!selectedAnswer || hasSubmitted) return;

    const normalizedSelectedAnswer = selectedAnswer.toLowerCase();
    const normalizedCorrectAnswer = question.correctAnswer.toString().toLowerCase();

    const isCorrect = normalizedSelectedAnswer === normalizedCorrectAnswer;

    setIsCorrect(isCorrect);
    setHasSubmitted(true);

    if (isCorrect) {
      toast({
        title: "🎯 Correct!",
        description: "Great job! Let's continue with the story.",
      });
      onCorrectAnswer();
    } else {
      toast({
        title: "Not quite right",
        description: question.explanation,
        variant: "destructive",
      });
      onWrongAnswer();
    }
  };

  // Convert options to proper format for true/false questions and ensure consistent casing
  const options = question.type === "true_false" 
    ? ["True", "False"]  // Keep UI display capitalized for better readability
    : question.options || [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">{question.question}</h3>
        
        <RadioGroup
          value={selectedAnswer || ""}
          onValueChange={setSelectedAnswer}
          className="space-y-3"
          disabled={hasSubmitted}
        >
          {options.map((option) => {
            const isSelected = selectedAnswer === option;
            const isCorrectAnswer = option.toLowerCase() === question.correctAnswer.toString().toLowerCase();
            const isWrongSelection = hasSubmitted && isSelected && !isCorrectAnswer;

            return (
              <div
                key={option}
                className={`relative rounded-lg border-2 transition-all ${
                  hasSubmitted ? 'cursor-not-allowed' : 'cursor-pointer hover:border-blue-500'
                } ${
                  isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                } ${
                  hasSubmitted && isCorrectAnswer ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''
                } ${
                  isWrongSelection ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''
                }`}
              >
                <label 
                  className="flex items-center w-full p-3 space-x-3"
                  htmlFor={option}
                >
                  <RadioGroupItem value={option} id={option} />
                  <span className="flex-1">{option}</span>
                  {hasSubmitted && isCorrectAnswer && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  {isWrongSelection && (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                </label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      <motion.button
        whileHover={{ scale: !selectedAnswer || hasSubmitted ? 1 : 1.02 }}
        whileTap={{ scale: !selectedAnswer || hasSubmitted ? 1 : 0.98 }}
        onClick={handleSubmit}
        disabled={!selectedAnswer || hasSubmitted}
        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
      >
        Submit Answer
      </motion.button>
    </motion.div>
  );
};

export default StoryQuiz;

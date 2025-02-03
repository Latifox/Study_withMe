import { useState } from "react";
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
}

const StoryQuiz = ({ question, onCorrectAnswer, onWrongAnswer }: StoryQuizProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!selectedAnswer || hasSubmitted) return;

    const isCorrect = 
      question.type === "true_false" 
        ? selectedAnswer === question.correctAnswer.toString()
        : selectedAnswer === question.correctAnswer;

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
          {question.type === "true_false" ? (
            <>
              {["true", "false"].map((option) => (
                <motion.div
                  key={option}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer
                    ${selectedAnswer === option ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
                    ${hasSubmitted && option === question.correctAnswer.toString() ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
                    ${hasSubmitted && selectedAnswer === option && option !== question.correctAnswer.toString() ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
                  `}
                >
                  <RadioGroupItem value={option} id={option} />
                  <label htmlFor={option} className="flex-1 cursor-pointer">
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </label>
                  {hasSubmitted && option === question.correctAnswer.toString() && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  {hasSubmitted && selectedAnswer === option && option !== question.correctAnswer.toString() && (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                </motion.div>
              ))}
            </>
          ) : (
            <>
              {question.options?.map((option) => (
                <motion.div
                  key={option}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer
                    ${selectedAnswer === option ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
                    ${hasSubmitted && option === question.correctAnswer ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
                    ${hasSubmitted && selectedAnswer === option && option !== question.correctAnswer ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
                  `}
                >
                  <RadioGroupItem value={option} id={option} />
                  <label htmlFor={option} className="flex-1 cursor-pointer">{option}</label>
                  {hasSubmitted && option === question.correctAnswer && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  {hasSubmitted && selectedAnswer === option && option !== question.correctAnswer && (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                </motion.div>
              ))}
            </>
          )}
        </RadioGroup>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
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
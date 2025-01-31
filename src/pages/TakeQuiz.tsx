import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader } from "lucide-react";

interface Question {
  question: string;
  type: "multiple_choice" | "true_false";
  options: string[];
  correctAnswer: string;
  hint?: string;
}

interface QuizState {
  questions: Question[];
  userAnswers: Record<number, string>;
  showResults: boolean;
  timeRemaining: number;
}

const TakeQuiz = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { lectureId } = useParams();
  const [quizConfig, setQuizConfig] = useState<any>(null);

  useEffect(() => {
    // Try to get config from localStorage
    const storedConfig = localStorage.getItem(`quiz_config_${lectureId}`);
    if (storedConfig) {
      setQuizConfig(JSON.parse(storedConfig));
    } else {
      toast({
        title: "Error",
        description: "Quiz configuration not found. Please try again.",
        variant: "destructive",
      });
      navigate(`/lecture/${lectureId}`);
    }
  }, [lectureId]);

  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    userAnswers: {},
    showResults: false,
    timeRemaining: 900, // Will be updated when config is loaded
  });

  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (quizConfig) {
      setQuizState(prev => ({
        ...prev,
        timeRemaining: quizConfig.config.timeLimit * 60
      }));

      const generateQuiz = async () => {
        try {
          setIsLoading(true);
          const { data, error } = await supabase.functions.invoke('generate-quiz', {
            body: { 
              lectureId: quizConfig.lectureId, 
              config: quizConfig.config 
            },
          });

          if (error) throw error;
          setQuizState(prev => ({ ...prev, questions: data.quiz }));
        } catch (error) {
          console.error('Error generating quiz:', error);
          toast({
            title: "Error",
            description: "Failed to generate quiz. Please try again.",
            variant: "destructive",
          });
          navigate(`/lecture/${lectureId}`);
        } finally {
          setIsLoading(false);
        }
      };

      generateQuiz();
    }
  }, [quizConfig]);

  useEffect(() => {
    if (!quizState.showResults && quizState.timeRemaining > 0) {
      const timer = setInterval(() => {
        setQuizState(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        }));
      }, 1000);

      return () => clearInterval(timer);
    } else if (quizState.timeRemaining <= 0 && !quizState.showResults) {
      submitQuiz();
    }
  }, [quizState.timeRemaining, quizState.showResults]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setQuizState(prev => ({
      ...prev,
      userAnswers: {
        ...prev.userAnswers,
        [questionIndex]: answer,
      },
    }));
  };

  const toggleHint = (questionIndex: number) => {
    setShowHint(prev => ({
      ...prev,
      [questionIndex]: !prev[questionIndex],
    }));
  };

  const submitQuiz = () => {
    setQuizState(prev => ({ ...prev, showResults: true }));
  };

  const calculateScore = () => {
    const correctAnswers = quizState.questions.reduce((count, question, index) => {
      return count + (quizState.userAnswers[index] === question.correctAnswer ? 1 : 0);
    }, 0);
    return `${correctAnswers}/${quizState.questions.length}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <Loader className="w-8 h-8 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Please wait while we generate your quiz...</p>
      </div>
    );
  }

  if (quizState.questions.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="sticky top-0 bg-white z-10 p-4 border-b mb-4">
        <div className="flex justify-between items-center">
          <div className="text-xl font-bold">
            Time Remaining: {formatTime(quizState.timeRemaining)}
          </div>
          {!quizState.showResults && (
            <Button onClick={submitQuiz}>Submit Quiz</Button>
          )}
        </div>
        {quizState.showResults && (
          <div className="mt-2 text-lg">
            Final Score: {calculateScore()}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {quizState.questions.map((question, index) => (
          <Card key={index} className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold">
                  {index + 1}. {question.question}
                </h3>
                {config?.hintsEnabled && question.hint && (
                  <Button
                    variant="outline"
                    onClick={() => toggleHint(index)}
                    className="ml-4"
                  >
                    {showHint[index] ? 'Hide Hint' : 'Show Hint'}
                  </Button>
                )}
              </div>

              {showHint[index] && question.hint && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  Hint: {question.hint}
                </div>
              )}

              <RadioGroup
                value={quizState.userAnswers[index]}
                onValueChange={(value) => handleAnswerChange(index, value)}
                disabled={quizState.showResults}
              >
                {question.options.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    className={`flex items-center space-x-2 p-2 rounded ${
                      quizState.showResults
                        ? option === question.correctAnswer
                          ? 'bg-green-100'
                          : quizState.userAnswers[index] === option
                          ? 'bg-red-100'
                          : ''
                        : ''
                    }`}
                  >
                    <RadioGroupItem value={option} id={`q${index}-${optionIndex}`} />
                    <label
                      htmlFor={`q${index}-${optionIndex}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </RadioGroup>

              {quizState.showResults && (
                <div className="mt-2 text-sm">
                  {quizState.userAnswers[index] === question.correctAnswer ? (
                    <span className="text-green-600">Correct!</span>
                  ) : (
                    <span className="text-red-600">
                      Incorrect. The correct answer is: {question.correctAnswer}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {!quizState.showResults && (
        <div className="fixed bottom-4 right-4">
          <Button onClick={submitQuiz} size="lg">
            Submit Quiz
          </Button>
        </div>
      )}
    </div>
  );
};

export default TakeQuiz;

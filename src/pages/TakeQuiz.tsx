import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader, RefreshCw, ArrowLeft, Flame, BookOpen, Star } from "lucide-react";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import { Question, QuizResponse, QuizData, isQuizData } from "@/types/quiz";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface QuizState {
  questions: Question[];
  userAnswers: Record<number, string>;
  showResults: boolean;
  timeRemaining: number;
}

const TakeQuiz = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { courseId, lectureId } = useParams();
  const [quizConfig, setQuizConfig] = useState<any>(null);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalLectures, setTotalLectures] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

  useEffect(() => {
    const storedConfig = localStorage.getItem(`quiz_config_${lectureId}`);
    if (storedConfig) {
      setQuizConfig(JSON.parse(storedConfig));
    } else {
      toast({
        title: "Error",
        description: "Quiz configuration not found. Please try again.",
        variant: "destructive",
      });
      navigate(`/course/${courseId}`);
    }
  }, [lectureId, courseId, navigate, toast]);

  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    userAnswers: {},
    showResults: false,
    timeRemaining: 900,
  });

  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const { data: userProgress } = useQuery({
    queryKey: ['take-quiz-progress', lectureId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('user_progress')
        .select('score, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });
      
      return data || [];
    }
  });

  const { data: quizProgressData } = useQuery({
    queryKey: ['take-quiz-quiz-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('quiz_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: true });
      
      return data || [];
    }
  });

  useEffect(() => {
    if (userProgress) {
      const calculateStreak = () => {
        if (!userProgress?.length) return 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const uniqueDates = new Set(
          userProgress
            .filter(p => p.completed_at)
            .map(p => {
              const date = new Date(p.completed_at!);
              date.setHours(0, 0, 0, 0);
              return date.toISOString();
            })
        );

        let streak = 0;
        let currentDate = today;

        while (uniqueDates.has(currentDate.toISOString())) {
          streak++;
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() - 1);
          currentDate.setHours(0, 0, 0, 0);
        }

        return streak;
      };

      const calculatedTotalXP = userProgress.reduce((sum, progress) => sum + (progress.score || 0), 0);
      
      setCurrentStreak(calculateStreak());
      setTotalXP(calculatedTotalXP);
    }
  }, [userProgress]);

  useEffect(() => {
    if (quizProgressData) {
      const calculatedTotalLectures = new Set(quizProgressData.map(p => p.lecture_id)).size;
      setTotalLectures(calculatedTotalLectures);
    }
  }, [quizProgressData]);

  useEffect(() => {
    if (quizConfig) {
      setQuizState(prev => ({
        ...prev,
        timeRemaining: quizConfig.config.timeLimit * 60
      }));

      const generateQuiz = async () => {
        try {
          setIsLoading(true);
          console.log('Generating quiz with config:', quizConfig);
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User authentication required');
          }
          
          console.log('Always generating a new quiz');
          
          const { data, error } = await supabase.functions.invoke<QuizResponse>('generate-quiz', {
            body: { 
              lectureId: quizConfig.lectureId, 
              config: quizConfig.config 
            },
          });

          if (error) {
            console.error('Error invoking function:', error);
            throw error;
          }
          
          console.log('Quiz generation response:', data);
          
          if (!data || !('quiz' in data) || !Array.isArray(data.quiz)) {
            throw new Error('Invalid quiz data returned');
          }
          
          if (data.quizId) {
            setQuizId(data.quizId);
          }
          
          setQuizState(prev => ({ ...prev, questions: data.quiz }));
        } catch (error) {
          console.error('Error generating quiz:', error);
          toast({
            title: "Error",
            description: "Failed to generate quiz. Please try again.",
            variant: "destructive",
          });
          navigate(`/course/${courseId}`);
        } finally {
          setIsLoading(false);
        }
      };

      generateQuiz();
    }
  }, [quizConfig, courseId, navigate, toast]);

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

  const submitQuiz = async () => {
    setQuizState(prev => ({ ...prev, showResults: true }));
    
    if (quizId) {
      try {
        const score = calculateCorrectAnswers();
        const totalQuestions = quizState.questions.length;
        const scorePercentage = (score / totalQuestions) * 100;
        
        const { error } = await supabase
          .from('generated_quizzes')
          .update({ 
            quiz_result: scorePercentage 
          })
          .eq('id', quizId);
        
        if (error) {
          console.error('Error saving quiz result:', error);
          toast({
            title: "Warning",
            description: "Your quiz was completed but we couldn't save your score.",
            variant: "destructive",
          });
        } else {
          console.log(`Quiz completed with score: ${score}/${totalQuestions} (${scorePercentage}%)`);
          toast({
            title: "Success",
            description: `Quiz completed! Your score: ${score}/${totalQuestions}`,
            variant: "default",
          });
        }
      } catch (error) {
        console.error('Error in quiz submission:', error);
      }
    }
  };

  const normalizeText = (text: string) => text.toString().trim().toLowerCase().replace(/\s+/g, ' ');

  const calculateCorrectAnswers = () => {
    return quizState.questions.reduce((count, question, index) => {
      const userAnswer = quizState.userAnswers[index];
      const correctAnswer = question.correctAnswer;
      
      if (!userAnswer) return count;
      
      const userAnswerNormalized = normalizeText(userAnswer);
      const correctAnswerNormalized = normalizeText(correctAnswer);
      
      return count + (userAnswerNormalized === correctAnswerNormalized ? 1 : 0);
    }, 0);
  };

  const calculateScore = () => {
    const correctAnswers = calculateCorrectAnswers();
    return `${correctAnswers}/${quizState.questions.length}`;
  };

  const handleGenerateNewQuiz = () => {
    setQuizState({
      questions: [],
      userAnswers: {},
      showResults: false,
      timeRemaining: quizConfig.config.timeLimit * 60,
    });
    setIsLoading(true);
    const generateQuiz = async () => {
      try {
        const { data, error } = await supabase.functions.invoke<QuizResponse>('generate-quiz', {
          body: { 
            lectureId: quizConfig.lectureId, 
            config: quizConfig.config,
            forceNew: true
          },
        });

        if (error) throw error;
        
        if (!data || !('quiz' in data) || !Array.isArray(data.quiz)) {
          throw new Error('Invalid quiz data returned');
        }
        
        if (data.quizId) {
          setQuizId(data.quizId);
        }
        
        setQuizState(prev => ({ ...prev, questions: data.quiz }));
      } catch (error) {
        console.error('Error generating quiz:', error);
        toast({
          title: "Error",
          description: "Failed to generate quiz. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    generateQuiz();
  };

  const handleBackToLectures = () => {
    navigate(`/course/${courseId}`);
  };

  if (isLoading) {
    return (
      <BackgroundGradient>
        <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Please wait while we generate your quiz...</p>
        </div>
      </BackgroundGradient>
    );
  }

  if (quizState.questions.length === 0) {
    return null;
  }

  return (
    <BackgroundGradient>
      <div className="container mx-auto p-4">
        <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 p-4 border-b mb-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center">
            <div className="text-xl font-bold">
              Time Remaining: {formatTime(quizState.timeRemaining)}
            </div>
            <div className="flex items-center gap-5">
              <div className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-full",
                "bg-white/60 backdrop-blur-sm border border-white/50"
              )}>
                <Flame className="h-6 w-6 text-red-500 fill-red-500" />
                <span className="font-bold text-lg">{currentStreak}</span>
              </div>
              <div className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-full",
                "bg-white/60 backdrop-blur-sm border border-white/50"
              )}>
                <BookOpen className="h-6 w-6 text-emerald-200" />
                <span className="font-bold text-lg">{totalLectures}</span>
              </div>
              <div className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-full",
                "bg-white/60 backdrop-blur-sm border border-white/50"
              )}>
                <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-lg">{totalXP}</span>
              </div>
            </div>
          </div>
          {quizState.showResults && (
            <div className="space-y-4">
              <div className="mt-2 text-lg">
                Final Score: {calculateScore()}
              </div>
              <div className="flex gap-4">
                <Button onClick={handleGenerateNewQuiz} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Generate New Quiz
                </Button>
                <Button onClick={handleBackToLectures} variant="outline" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Lectures
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {quizState.questions.map((question, index) => (
            <Card key={index} className="p-6 bg-white/90 backdrop-blur-sm border border-white/30 shadow-md">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold">
                    {index + 1}. {question.question}
                  </h3>
                  {quizConfig?.config?.hintsEnabled && question.hint && (
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
            <Button onClick={submitQuiz} size="lg" className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg">
              Submit Quiz
            </Button>
          </div>
        )}
      </div>
    </BackgroundGradient>
  );
};

export default TakeQuiz;


import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

interface Flashcard {
  id?: number;
  question: string;
  answer: string;
  lecture_id?: number;
}

interface FlashcardItemProps {
  flashcard: Flashcard;
  isFlipped: boolean;
  onClick: () => void;
  index: number;
  activeIndex: number | null;
}

const FlashcardItem = ({ flashcard, isFlipped, onClick, index, activeIndex }: FlashcardItemProps) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isActive = activeIndex === index;

  useEffect(() => {
    if (isActive && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isFlipped) {
      setUserAnswer("");
      setFeedback("");
      setHasSubmitted(false);
    }
  }, [isFlipped]);

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-lecture', {
        body: {
          message: `I'm evaluating a student's answer to a flashcard question.
          Question: "${flashcard.question}"
          Student's answer: "${userAnswer}"
          Correct answer: "${flashcard.answer}"
          
          Compare the student's answer with the correct answer and rate it on a scale from 1-10.
          Provide brief, specific feedback (2-3 sentences) explaining why the answer is correct or incorrect.
          Focus ONLY on comparing the student's answer with the correct answer, not on providing additional information.`,
          lectureId: flashcard.lecture_id
        }
      });

      if (error) throw error;
      
      const aiResponse = data.choices[0].message.content;
      setFeedback(aiResponse);
    } catch (error) {
      console.error("Error getting AI feedback:", error);
      setFeedback("Sorry, I couldn't evaluate your answer. The correct answer is: " + flashcard.answer);
    } finally {
      setIsSubmitting(false);
      setHasSubmitted(true);
    }
  };

  const handleCardBackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only flip the card if the click is directly on the card background
    // not on any of its interactive children elements
    if (e.currentTarget === e.target) {
      onClick();
    }
  };

  const handleCardClick = () => {
    if (!isActive) {
      setIsExpanded(true);
      onClick();
    }
  };

  // Calculate styles based on expanded and active state
  const cardScale = isActive ? (isExpanded ? "scale-110 md:scale-125" : "scale-105") : "scale-100";
  const cardZIndex = isActive ? "z-20" : "z-0";
  const cardOpacity = isActive || activeIndex === null ? "opacity-100" : "opacity-50";
  const cardPosition = isActive && isExpanded ? "md:fixed md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2" : "";
  const cardSize = isActive && isExpanded ? "md:w-[500px] md:h-[300px]" : "w-full h-64";
  const cardShadow = isActive && isExpanded ? "shadow-xl" : "shadow-md";

  return (
    <div 
      className={`perspective-1000 cursor-pointer transition-all duration-300 ${cardScale} ${cardZIndex} ${cardOpacity} ${cardPosition}`}
      onClick={handleCardClick}
    >
      <div className={`relative ${cardSize} transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        <Card className={`absolute w-full h-full p-6 flex flex-col items-center justify-center text-center backface-hidden bg-gradient-to-br from-purple-600 to-indigo-700 border border-purple-300/30 ${cardShadow}`}>
          <p className="text-lg font-medium text-white">{flashcard.question}</p>
        </Card>
        
        <Card 
          className={`absolute w-full h-full p-4 flex flex-col justify-between text-center bg-gradient-to-br from-yellow-400 to-red-600 rotate-y-180 backface-hidden border border-orange-300/30 ${cardShadow}`}
          onClick={handleCardBackClick}
        >
          <div className="absolute top-2 right-2 z-20">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white" 
              onClick={(e) => {
                e.stopPropagation();
                onClick();
                setIsExpanded(false);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="sr-only">Turn card</span>
            </Button>
          </div>
          
          {!hasSubmitted ? (
            <>
              <div className="flex-1 flex flex-col items-center justify-center mb-2">
                <p className="text-white text-sm mb-2">Your answer:</p>
                <Textarea
                  ref={textareaRef}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full text-sm bg-white/10 text-white border-white/20 placeholder-white/50 resize-none"
                  placeholder="Type your answer here..."
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubmitAnswer();
                }}
                disabled={isSubmitting}
                className="w-full bg-white/20 hover:bg-white/30 text-white"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Checking...</>
                ) : (
                  'Submit Answer'
                )}
              </Button>
            </>
          ) : (
            <div className="flex flex-col h-full justify-between">
              <div className="overflow-auto text-sm text-white mb-2">
                <div className="mb-2 flex items-start">
                  <p className="font-bold">Your answer:</p>
                  <p className="ml-2 text-left">{userAnswer}</p>
                </div>
                <div className="border-t border-white/20 pt-2 mb-2">
                  <p className="font-bold flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-1 text-green-300" /> 
                    Correct answer:
                  </p>
                  <p className="text-left">{flashcard.answer}</p>
                </div>
                <div className="border-t border-white/20 pt-2">
                  <p className="font-bold">Feedback:</p>
                  <p className="text-left text-xs">{feedback}</p>
                </div>
              </div>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                  setIsExpanded(false);
                }}
                className="w-full bg-white/20 hover:bg-white/30 text-white"
              >
                Close
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default FlashcardItem;

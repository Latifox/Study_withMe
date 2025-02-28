
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import BackgroundGradient from "@/components/ui/BackgroundGradient";

interface Flashcard {
  question: string;
  answer: string;
}

const Flashcards = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [additionalCards, setAdditionalCards] = useState<Flashcard[]>([]);

  const { data: initialFlashcards, isLoading } = useQuery({
    queryKey: ['flashcards', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          lectureId: parseInt(lectureId!)
        }
      });
      if (error) {
        console.error('Error generating flashcards:', error);
        throw error;
      }
      return data.flashcards;
    },
    meta: {
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to generate flashcards. Please try again.",
          variant: "destructive"
        });
      }
    }
  });

  const allFlashcards = [...(initialFlashcards || []), ...additionalCards];

  const handleCardClick = (index: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const generateMoreFlashcards = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          lectureId: parseInt(lectureId!),
          count: 3
        }
      });
      if (error) throw error;
      setAdditionalCards(prev => [...prev, ...data.flashcards]);
      toast({
        title: "Success",
        description: "Generated new flashcards successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate more flashcards. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <BackgroundGradient>
        <div className="container mx-auto p-4">
          <div className="max-w-4xl mx-auto text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading flashcards...</p>
          </div>
        </div>
      </BackgroundGradient>;
  }

  return <BackgroundGradient>
      <div className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-start space-x-4 mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate(`/course/${courseId}/lecture/${lectureId}`)} 
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-md flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Lecture
            </Button>
            
            <div className="flex items-center gap-2 text-2xl font-bold">
              <BookOpen className="w-6 h-6 text-purple-500" />
              <span className="text-purple-500">Flashcards</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {allFlashcards.map((flashcard, index) => <div key={index} className="perspective-1000 cursor-pointer" onClick={() => handleCardClick(index)}>
                <div className={`relative w-full h-64 transition-transform duration-500 transform-style-3d ${flippedCards.has(index) ? 'rotate-y-180' : ''}`}>
                  <Card className="absolute w-full h-full p-6 flex items-center justify-center text-center backface-hidden bg-white/90 backdrop-blur-sm border border-purple-200/30 shadow-md">
                    <p className="text-lg font-medium text-gray-800">{flashcard.question}</p>
                  </Card>
                  <Card className="absolute w-full h-full p-6 flex items-center justify-center text-center bg-gradient-to-br from-purple-50 to-indigo-50 rotate-y-180 backface-hidden border border-purple-200/30 shadow-md">
                    <p className="text-lg text-gray-800">{flashcard.answer}</p>
                  </Card>
                </div>
              </div>)}
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={generateMoreFlashcards} 
              className="bg-purple-500 hover:bg-purple-600 text-white font-medium px-6 py-2 rounded-md"
            >
              Generate More Flashcards
            </Button>
          </div>
        </div>
      </div>
    </BackgroundGradient>;
};

export default Flashcards;

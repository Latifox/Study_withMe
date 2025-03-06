import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, BookOpen, Flame, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import StoryBackground from "@/components/ui/StoryBackground";
import { cn } from "@/lib/utils";
interface Flashcard {
  id?: number;
  question: string;
  answer: string;
  lecture_id?: number;
}
const Flashcards = () => {
  const {
    courseId,
    lectureId
  } = useParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalLectures, setTotalLectures] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const {
    data: savedFlashcards,
    isLoading: isLoadingSaved
  } = useQuery({
    queryKey: ['saved-flashcards', lectureId],
    queryFn: async () => {
      console.log('Fetching saved flashcards for lecture:', lectureId);
      const {
        data,
        error
      } = await supabase.from('flashcards').select('*').eq('lecture_id', parseInt(lectureId!)).order('id');
      if (error) {
        console.error('Error fetching saved flashcards:', error);
        throw error;
      }
      console.log('Retrieved flashcards:', data?.length || 0);
      return data as Flashcard[];
    }
  });
  const {
    data: generatedFlashcards,
    isLoading: isGenerating,
    refetch: regenerateFlashcards
  } = useQuery({
    queryKey: ['generated-flashcards', lectureId],
    queryFn: async () => {
      console.log('Generating flashcards for lecture:', lectureId);
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke('generate-flashcards', {
          body: {
            lectureId: parseInt(lectureId!),
            count: 6
          }
        });
        if (error) {
          console.error('Error generating flashcards:', error);
          throw error;
        }
        console.log('Generated flashcards successfully:', data.flashcards?.length || 0);
        return data.flashcards as Flashcard[];
      } catch (e) {
        console.error('Exception in generate-flashcards:', e);
        throw e;
      }
    },
    enabled: false,
    meta: {
      onError: (error: any) => {
        console.error('Error in generate-flashcards query:', error);
        toast({
          title: "Error",
          description: "Failed to generate flashcards. Please try again.",
          variant: "destructive"
        });
      }
    }
  });
  const saveFlashcardsMutation = useMutation({
    mutationFn: async (flashcards: Flashcard[]) => {
      console.log('Saving flashcards to database:', flashcards.length);
      const preparedFlashcards = flashcards.map(card => ({
        lecture_id: parseInt(lectureId!),
        question: card.question,
        answer: card.answer
      }));
      const {
        data,
        error
      } = await supabase.from('flashcards').insert(preparedFlashcards).select();
      if (error) {
        console.error('Error saving flashcards:', error);
        throw error;
      }
      console.log('Flashcards saved successfully:', data?.length || 0);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['saved-flashcards', lectureId]
      });
      toast({
        title: "Success",
        description: "Flashcards saved successfully!"
      });
    },
    onError: (error: any) => {
      console.error('Save flashcards mutation error:', error);
      toast({
        title: "Error",
        description: `Failed to save flashcards: ${error.message || "Unknown error"}`,
        variant: "destructive"
      });
    }
  });
  const {
    data: userProgress
  } = useQuery({
    queryKey: ['flashcard-progress', lectureId],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return null;
      const {
        data
      } = await supabase.from('user_progress').select('score, completed_at').eq('user_id', user.id).order('completed_at', {
        ascending: false
      });
      return data || [];
    }
  });
  const {
    data: quizProgressData
  } = useQuery({
    queryKey: ['flashcard-quiz-progress'],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return null;
      const {
        data
      } = await supabase.from('quiz_progress').select('*').eq('user_id', user.id).order('completed_at', {
        ascending: true
      });
      return data || [];
    }
  });
  useEffect(() => {
    if (userProgress) {
      const calculateStreak = () => {
        if (!userProgress?.length) return 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const uniqueDates = new Set(userProgress.filter(p => p.completed_at).map(p => {
          const date = new Date(p.completed_at!);
          date.setHours(0, 0, 0, 0);
          return date.toISOString();
        }));
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
    if (savedFlashcards && savedFlashcards.length === 0) {
      console.log('No saved flashcards found, generating new ones');
      regenerateFlashcards();
    }
  }, [savedFlashcards, regenerateFlashcards]);
  useEffect(() => {
    if (generatedFlashcards && generatedFlashcards.length > 0 && !isGenerating) {
      console.log('New flashcards generated, saving to database');
      saveFlashcardsMutation.mutate(generatedFlashcards);
    }
  }, [generatedFlashcards, isGenerating]);
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
      console.log('Generating more flashcards');
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          lectureId: parseInt(lectureId!),
          count: 3
        }
      });
      if (error) {
        console.error('Error generating more flashcards:', error);
        throw error;
      }
      console.log('Generated additional flashcards:', data.flashcards?.length || 0);
      saveFlashcardsMutation.mutate(data.flashcards);
      toast({
        title: "Success",
        description: "Generated new flashcards successfully!"
      });
    } catch (error: any) {
      console.error('Exception in generateMoreFlashcards:', error);
      toast({
        title: "Error",
        description: `Failed to generate more flashcards: ${error.message || "Unknown error"}`,
        variant: "destructive"
      });
    }
  };
  const isLoading = isLoadingSaved || isGenerating || saveFlashcardsMutation.isPending;
  if (isLoading) {
    return <StoryBackground>
        <div className="container mx-auto p-4">
          <div className="max-w-4xl mx-auto text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading flashcards...</p>
          </div>
        </div>
      </StoryBackground>;
  }
  return <StoryBackground>
      <div className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate(`/course/${courseId}`)} className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-md flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Course
              </Button>
              
              <div className="flex items-center gap-2 text-2xl font-bold">
                
                <span className="text-purple-500">Flashcards</span>
              </div>
            </div>
            
            <div className="flex items-center gap-5">
              <div className={cn("flex items-center gap-3 px-5 py-3 rounded-full", "bg-white/60 backdrop-blur-sm border border-white/50")}>
                <Flame className="h-7 w-7 text-red-500 fill-red-500" />
                <span className="font-bold text-xl">{currentStreak}</span>
              </div>
              <div className={cn("flex items-center gap-3 px-5 py-3 rounded-full", "bg-white/60 backdrop-blur-sm border border-white/50")}>
                <BookOpen className="h-7 w-7 text-emerald-200" />
                <span className="font-bold text-xl">{totalLectures}</span>
              </div>
              <div className={cn("flex items-center gap-3 px-5 py-3 rounded-full", "bg-white/60 backdrop-blur-sm border border-white/50")}>
                <Star className="h-7 w-7 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-xl">{totalXP}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {savedFlashcards && savedFlashcards.map((flashcard, index) => <div key={flashcard.id} className="perspective-1000 cursor-pointer" onClick={() => handleCardClick(index)}>
                <div className={`relative w-full h-64 transition-transform duration-500 transform-style-3d ${flippedCards.has(index) ? 'rotate-y-180' : ''}`}>
                  <Card className="absolute w-full h-full p-6 flex items-center justify-center text-center backface-hidden bg-gradient-to-br from-purple-600 to-indigo-700 border border-purple-300/30 shadow-md">
                    <p className="text-lg font-medium text-white">{flashcard.question}</p>
                  </Card>
                  <Card className="absolute w-full h-full p-6 flex items-center justify-center text-center bg-gradient-to-br from-yellow-400 to-red-600 rotate-y-180 backface-hidden border border-orange-300/30 shadow-md">
                    <p className="text-lg text-white">{flashcard.answer}</p>
                  </Card>
                </div>
              </div>)}
          </div>

          <div className="flex justify-center">
            <Button onClick={generateMoreFlashcards} className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium px-6 py-2 rounded-md shadow-md">
              Generate More Flashcards
            </Button>
          </div>
        </div>
      </div>
    </StoryBackground>;
};
export default Flashcards;
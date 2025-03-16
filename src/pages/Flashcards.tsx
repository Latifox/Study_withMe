import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import StoryBackground from "@/components/ui/StoryBackground";
import FlashcardHeader from "@/components/flashcards/FlashcardHeader";
import FlashcardGrid from "@/components/flashcards/FlashcardGrid";
import FlashcardsLoading from "@/components/flashcards/FlashcardsLoading";

interface Flashcard {
  id?: number;
  question: string;
  answer: string;
  lecture_id?: number;
}

const Flashcards = () => {
  const { courseId, lectureId } = useParams();
  const { toast } = useToast();
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
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('lecture_id', parseInt(lectureId!))
        .order('id');
        
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
        const { data, error } = await supabase.functions.invoke('generate-flashcards', {
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
      const { data, error } = await supabase.from('flashcards').insert(preparedFlashcards).select();
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

  const {
    data: quizProgressData
  } = useQuery({
    queryKey: ['flashcard-quiz-progress'],
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

  const generateMoreFlashcards = async () => {
    try {
      console.log('Generating more flashcards');
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
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
    return <FlashcardsLoading />;
  }

  return (
    <StoryBackground>
      <div className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto">
          <FlashcardHeader 
            courseId={courseId!} 
            currentStreak={currentStreak}
            totalLectures={totalLectures}
            totalXP={totalXP}
          />

          <FlashcardGrid 
            flashcards={savedFlashcards || []} 
            onGenerateMore={generateMoreFlashcards}
          />
        </div>
      </div>
    </StoryBackground>
  );
};

export default Flashcards;

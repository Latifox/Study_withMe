import { Flame, BookOpen, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface StoryScoreHeaderProps {
  currentScore: number;
  currentStep: number;
  onBack: () => void;
  lectureId?: string | number;
}

const StoryScoreHeader = ({ currentScore, currentStep, onBack, lectureId }: StoryScoreHeaderProps) => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalLectures, setTotalLectures] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

  const { data: userProgress } = useQuery({
    queryKey: ['story-header-progress', lectureId],
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
    queryKey: ['story-header-quiz-progress'],
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

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        onClick={onBack}
        className="hover:scale-105 transition-transform border border-black"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Learning Pathway
      </Button>
      <div className="flex items-center gap-4">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-white/30 backdrop-blur-sm border border-white/50"
        )}>
          <Flame className="h-5 w-5 text-red-500 fill-red-500" />
          <span className="font-bold">{currentStreak}</span>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-white/30 backdrop-blur-sm border border-white/50"
        )}>
          <BookOpen className="h-5 w-5 text-emerald-200" />
          <span className="font-bold">{totalLectures}</span>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-white/30 backdrop-blur-sm border border-white/50"
        )}>
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          <span className="font-bold">{totalXP}</span>
        </div>
      </div>
    </div>
  );
};

export default StoryScoreHeader;

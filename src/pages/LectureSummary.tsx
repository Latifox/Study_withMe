import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, ExternalLink, BookOpen, Flame, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type Category = 'structure' | 'keyConcepts' | 'mainIdeas' | 'importantQuotes' | 'relationships' | 'supportingEvidence';

type SummaryContent = {
  [key in Category]: string;
};

const LectureSummary = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>('structure');
  const { toast } = useToast();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalLectures, setTotalLectures] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

  const { data: userProgress } = useQuery({
    queryKey: ['highlights-progress', lectureId],
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
    queryKey: ['highlights-quiz-progress'],
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

  const { data: lecture } = useQuery({
    queryKey: ["lecture", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .eq("id", parseInt(lectureId!))
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: firstHighlights, isLoading: isLoadingFirst } = useQuery({
    queryKey: ["lecture-highlights-first", lectureId],
    queryFn: async () => {
      console.log('Generating first set of highlights...');
      const { data: existingHighlights } = await supabase
        .from("lecture_highlights")
        .select("structure, key_concepts, main_ideas")
        .eq("lecture_id", parseInt(lectureId!))
        .maybeSingle();

      if (existingHighlights?.structure) {
        console.log('Found existing first highlights');
        return existingHighlights;
      }

      console.log('Generating new first highlights...');
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId, part: 'first-cards' }
      });

      if (error) throw error;
      return data.content;
    },
    enabled: !!lecture
  });

  const { data: secondHighlights, isLoading: isLoadingSecond } = useQuery({
    queryKey: ["lecture-highlights-second", lectureId],
    queryFn: async () => {
      console.log('Generating second set of highlights...');
      const { data: existingHighlights } = await supabase
        .from("lecture_highlights")
        .select("important_quotes, relationships, supporting_evidence")
        .eq("lecture_id", parseInt(lectureId!))
        .maybeSingle();

      if (existingHighlights?.important_quotes) {
        console.log('Found existing second highlights');
        return existingHighlights;
      }

      console.log('Generating new second highlights...');
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId, part: 'second-cards' }
      });

      if (error) throw error;
      return data.content;
    },
    enabled: !!lecture
  });

  const isLoading = isLoadingFirst || isLoadingSecond;

  const summaryData: SummaryContent = {
    structure: firstHighlights?.structure || '',
    keyConcepts: firstHighlights?.key_concepts || '',
    mainIdeas: firstHighlights?.main_ideas || '',
    importantQuotes: secondHighlights?.important_quotes || '',
    relationships: secondHighlights?.relationships || '',
    supportingEvidence: secondHighlights?.supporting_evidence || ''
  };

  if (isLoading) {
    return (
      <BackgroundGradient>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-[60vh]">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <p className="text-lg text-black">Generating highlights...</p>
              <p className="text-sm text-muted-foreground">
                This may take a moment as we analyze the lecture content.
              </p>
            </div>
          </div>
        </div>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/course/${courseId}`)}
            className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-none"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lectures
          </Button>
          
          <div className="flex items-center gap-5">
            <div className={cn(
              "flex items-center gap-3 px-5 py-3 rounded-full",
              "bg-white/60 backdrop-blur-sm border border-white/50"
            )}>
              <Flame className="h-7 w-7 text-red-500 fill-red-500" />
              <span className="font-bold text-xl">{currentStreak}</span>
            </div>
            <div className={cn(
              "flex items-center gap-3 px-5 py-3 rounded-full",
              "bg-white/60 backdrop-blur-sm border border-white/50"
            )}>
              <BookOpen className="h-7 w-7 text-emerald-200" />
              <span className="font-bold text-xl">{totalLectures}</span>
            </div>
            <div className={cn(
              "flex items-center gap-3 px-5 py-3 rounded-full",
              "bg-white/60 backdrop-blur-sm border border-white/50"
            )}>
              <Star className="h-7 w-7 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-xl">{totalXP}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent">
              <BookOpen className="w-5 h-5 inline mr-1" />
              Highlights
            </span>
          </h1>
          
          <Button 
            variant="outline"
            onClick={() => navigate(`/course/${courseId}/lecture/${lectureId}/highlights/fullversion`)}
            className="gap-2 bg-white/80 hover:bg-white"
          >
            Get Full Summary
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            {[
              { id: 'structure', label: 'Structure' },
              { id: 'keyConcepts', label: 'Key Concepts' },
              { id: 'mainIdeas', label: 'Main Ideas' },
              { id: 'importantQuotes', label: 'Important Quotes' },
              { id: 'relationships', label: 'Relationships' },
              { id: 'supportingEvidence', label: 'Supporting Evidence' }
            ].map(({ id, label }) => (
              <Card 
                key={id}
                className={`p-4 cursor-pointer hover:bg-white/80 transition-colors backdrop-blur-sm border border-black/20 shadow-md ${
                  selectedCategory === id ? 'bg-white/80 border-primary shadow-md' : 'bg-white/50'
                }`}
                onClick={() => setSelectedCategory(id as Category)}
              >
                <h2 className="text-lg font-semibold text-black">{label}</h2>
              </Card>
            ))}
          </div>

          <div className="md:col-span-2">
            <Card className="p-6 bg-white/30 backdrop-blur-md border border-black/20 shadow-md">
              <div className="prose prose-sm max-w-none text-black">
                <ReactMarkdown>
                  {summaryData[selectedCategory]}
                </ReactMarkdown>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default LectureSummary;

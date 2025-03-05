
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flame, BookOpen, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import StudyPlanLoading from "@/components/story/StudyPlanLoading";
import { Json } from "@/integrations/supabase/types";
import { StudyPlan as StudyPlanType, LearningStep } from "@/types/study-plan";
import KeyTopicsCard from "@/components/study/KeyTopicsCard";
import LearningStepCard from "@/components/study/LearningStepCard";
import { defaultSteps } from "@/constants/defaultLearningSteps";
import { isValidLearningStep } from "@/utils/studyPlanUtils";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const StudyPlan = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalLectures, setTotalLectures] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

  const { data: segments } = useQuery({
    queryKey: ['lecture-segments', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lecture_segments')
        .select('title')
        .eq('lecture_id', Number(lectureId))
        .order('sequence_number', { ascending: true });

      if (error) {
        console.error('Error fetching segments:', error);
        return [];
      }

      return data.map(segment => segment.title);
    },
  });

  // Add user progress query for stats
  const { data: userProgress } = useQuery({
    queryKey: ['study-plan-progress', lectureId],
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

  // Add quiz progress query for stats
  const { data: quizProgressData } = useQuery({
    queryKey: ['study-plan-quiz-progress'],
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

  // Calculate stats from progress data
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

  const { data: studyPlan, isLoading, error } = useQuery({
    queryKey: ['study-plan', lectureId],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.user) {
        throw new Error("Authentication required");
      }

      const { data: existingPlan, error: fetchError } = await supabase
        .from('study_plans')
        .select('*')
        .eq('lecture_id', Number(lectureId))
        .maybeSingle();

      if (fetchError) {
        console.error('Failed to fetch study plan:', fetchError);
        throw fetchError;
      }

      if (existingPlan?.is_generated) {
        const learningSteps = ((existingPlan.learning_steps as Json) as unknown as LearningStep[]) || defaultSteps;
        const validatedSteps = learningSteps.every(isValidLearningStep) ? learningSteps : defaultSteps;
        
        console.log('Existing plan key_topics:', existingPlan.key_topics); // Debug log

        return {
          ...existingPlan,
          learning_steps: validatedSteps,
          key_topics: segments || [] // Use segments as key topics
        };
      }

      try {
        const { data: newPlan, error: genError } = await supabase.functions.invoke<StudyPlanType>("generate-mindmap", {
          body: { lectureId: Number(lectureId) },
        });

        if (genError) throw genError;

        const learningStepsJson = defaultSteps.map(step => ({
          ...step,
          benefits: step.benefits
        })) as unknown as Json;

        const planToInsert = {
          lecture_id: Number(lectureId),
          title: newPlan.title || 'Study Plan',
          key_topics: segments || [], // Use segments as key topics
          learning_steps: learningStepsJson,
          is_generated: true
        };

        const { data: insertedPlan, error: insertError } = await supabase
          .from('study_plans')
          .insert(planToInsert)
          .select()
          .single();

        if (insertError) {
          console.error('Failed to store study plan:', insertError);
          toast({
            title: "Warning",
            description: "Study plan generated but couldn't be saved for future use.",
            variant: "destructive",
          });
          return {
            ...planToInsert,
            id: -1,
            learning_steps: defaultSteps,
          };
        }

        return {
          ...insertedPlan,
          learning_steps: defaultSteps,
          key_topics: segments || [] // Use segments as key topics
        };

      } catch (error) {
        console.error('Failed to generate or store study plan:', error);
        toast({
          title: "Error",
          description: "Failed to generate learning journey. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    retry: (failureCount, error) => {
      if (error.message === "Authentication required") {
        return false;
      }
      return failureCount < 3;
    },
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  if (error) {
    if (error.message === "Authentication required") {
      navigate('/auth', { state: { returnTo: `/course/${courseId}/lecture/${lectureId}/study-plan` }});
      return null;
    }
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600">
        <Card className="p-6 text-center bg-white/10 backdrop-blur-md border-white/20">
          <h2 className="text-2xl font-bold mb-4">Error Loading Study Plan</h2>
          <p className="text-white/80 mb-4">
            {error.message || "Failed to load the study plan. Please try again."}
          </p>
          <Button
            onClick={() => navigate(`/course/${courseId}`)}
            className="bg-white/20 hover:bg-white/30 text-white"
          >
            Return to Course
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <StudyPlanLoading />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600">
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="absolute top-0 left-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-violet-900/50 via-transparent to-transparent"></div>
      </div>

      <div className="relative p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(`/course/${courseId}`)}
              className="gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Lectures
            </Button>

            {/* Add stats display */}
            <div className="flex items-center gap-5">
              <div className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-full",
                "bg-white/40 backdrop-blur-sm border border-white/50"
              )}>
                <Flame className="h-6 w-6 text-red-500 fill-red-500" />
                <span className="font-bold text-lg text-white">{currentStreak}</span>
              </div>
              <div className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-full",
                "bg-white/40 backdrop-blur-sm border border-white/50"
              )}>
                <BookOpen className="h-6 w-6 text-emerald-200" />
                <span className="font-bold text-lg text-white">{totalLectures}</span>
              </div>
              <div className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-full",
                "bg-white/40 backdrop-blur-sm border border-white/50"
              )}>
                <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-lg text-white">{totalXP}</span>
              </div>
            </div>
          </div>

          {studyPlan && (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-8"
            >
              <motion.div variants={item}>
                <h1 className="text-4xl font-bold text-white mb-4">
                  {studyPlan.title || 'Study Plan'}
                </h1>
                {Array.isArray(segments) && segments.length > 0 && (
                  <KeyTopicsCard topics={segments} />
                )}
              </motion.div>

              <div className="space-y-6">
                {studyPlan.learning_steps.map((step, index) => (
                  <motion.div
                    key={step.step}
                    variants={item}
                    className="relative"
                  >
                    {index !== studyPlan.learning_steps.length - 1 && (
                      <div className="absolute left-8 top-[4.5rem] bottom-0 w-0.5 bg-white/20" />
                    )}
                    <LearningStepCard
                      step={step}
                      courseId={courseId || ""}
                      lectureId={lectureId || ""}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyPlan;

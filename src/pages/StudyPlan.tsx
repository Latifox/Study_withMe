import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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

const StudyPlan = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

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
          key_topics: Array.isArray(existingPlan.key_topics) ? existingPlan.key_topics : []
        };
      }

      try {
        const { data: newPlan, error: genError } = await supabase.functions.invoke<StudyPlanType>("generate-mindmap", {
          body: { lectureId: Number(lectureId) },
        });

        if (genError) throw genError;

        console.log('New plan key_topics:', newPlan.key_topics); // Debug log

        const learningStepsJson = defaultSteps.map(step => ({
          ...step,
          benefits: step.benefits
        })) as unknown as Json;

        const keyTopicsArray = Array.isArray(newPlan.key_topics) ? newPlan.key_topics : [];

        const planToInsert = {
          lecture_id: Number(lectureId),
          title: newPlan.title || 'Study Plan',
          key_topics: keyTopicsArray,
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
          key_topics: keyTopicsArray
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

  console.log('Rendered study plan key_topics:', studyPlan?.key_topics); // Debug log

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
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(`/course/${courseId}`)}
              className="gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Lectures
            </Button>
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
                {Array.isArray(studyPlan.key_topics) && studyPlan.key_topics.length > 0 && (
                  <KeyTopicsCard topics={studyPlan.key_topics} />
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

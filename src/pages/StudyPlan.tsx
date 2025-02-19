
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, MessageSquare, Activity, Brain, Network } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface LearningStep {
  step: number;
  title: string;
  description: string;
  action: string;
  timeEstimate: string;
  benefits: string[];
}

interface LearningJourney {
  title: string;
  keyTopics: string[];
  learningSteps: LearningStep[];
}

const StudyPlan = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: journey, isLoading } = useQuery({
    queryKey: ['study-plan', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<LearningJourney>("generate-mindmap", {
        body: { lectureId },
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to generate learning journey. Please try again.",
          variant: "destructive",
        });
        throw error;
      }

      return data;
    },
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'summary':
        return <BookOpen className="w-6 h-6" />;
      case 'chat':
        return <MessageSquare className="w-6 h-6" />;
      case 'flashcards':
        return <Activity className="w-6 h-6" />;
      case 'quiz':
        return <Brain className="w-6 h-6" />;
      case 'resources':
        return <Network className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const handleActionClick = (action: string) => {
    switch (action) {
      case 'summary':
        navigate(`/course/${courseId}/lecture/${lectureId}/summary`);
        break;
      case 'chat':
        navigate(`/course/${courseId}/lecture/${lectureId}/chat`);
        break;
      case 'flashcards':
        navigate(`/course/${courseId}/lecture/${lectureId}/flashcards`);
        break;
      case 'quiz':
        navigate(`/course/${courseId}/lecture/${lectureId}/quiz`);
        break;
      case 'resources':
        navigate(`/course/${courseId}/lecture/${lectureId}/resources`);
        break;
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/course/${courseId}`)}
            className="gap-2 hover:bg-primary/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        ) : journey ? (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            <motion.div variants={item}>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80 mb-4">
                {journey.title}
              </h1>
              <Card className="p-6 backdrop-blur-xl bg-card/30 border-primary/20">
                <h2 className="text-xl font-semibold mb-3 text-primary">Key Topics</h2>
                <div className="flex flex-wrap gap-2">
                  {journey.keyTopics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm backdrop-blur-xl border border-primary/20"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </Card>
            </motion.div>

            <div className="space-y-6">
              {journey.learningSteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  variants={item}
                  className="relative"
                >
                  {index !== journey.learningSteps.length - 1 && (
                    <div className="absolute left-8 top-[4.5rem] bottom-0 w-0.5 bg-primary/20" />
                  )}
                  
                  <Card className="relative backdrop-blur-xl bg-card/30 border-primary/20 p-6 hover:bg-card/40 transition-all duration-300">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                        {getActionIcon(step.action)}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-semibold text-primary">{step.title}</h3>
                          <span className="text-sm text-muted-foreground">{step.timeEstimate}</span>
                        </div>
                        <p className="text-foreground/80 mb-4">{step.description}</p>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {step.benefits.map((benefit, i) => (
                              <span
                                key={i}
                                className="text-sm text-foreground/60 bg-primary/5 px-2 py-1 rounded border border-primary/10"
                              >
                                {benefit}
                              </span>
                            ))}
                          </div>
                          <Button
                            onClick={() => handleActionClick(step.action)}
                            className="w-full sm:w-auto bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-300"
                          >
                            Start This Step
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-8 text-destructive">
            Failed to generate learning journey. Please try again.
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlan;

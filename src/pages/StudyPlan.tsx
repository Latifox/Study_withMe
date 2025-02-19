import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, MessageSquare, Activity, Brain, Network, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import StudyPlanLoading from "@/components/story/StudyPlanLoading";

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

      if (data && data.learningSteps && data.learningSteps.length > 0) {
        const storyModeStep = {
          step: 1.5,
          title: "Experience Story Mode",
          description: "Dive into an interactive story-based learning experience that makes complex concepts easier to understand and remember.",
          action: "story",
          timeEstimate: "15-20 min",
          benefits: ["Interactive Learning", "Engaging Narrative", "Better Retention"]
        };

        const updatedSteps = [...data.learningSteps];
        updatedSteps.splice(1, 0, storyModeStep);
        data.learningSteps = updatedSteps.map((step, index) => ({
          ...step,
          step: index + 1
        }));
      }

      return data;
    },
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'summary':
        return <FileText className="w-6 h-6" />;
      case 'story':
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
      case 'story':
        navigate(`/course/${courseId}/lecture/${lectureId}/story`);
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
              className="gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-white/20 text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Lectures
            </Button>
          </div>

          {isLoading ? (
            <StudyPlanLoading />
          ) : journey ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-8"
            >
              <motion.div variants={item}>
                <h1 className="text-4xl font-bold text-white mb-4">
                  {journey.title}
                </h1>
                <Card className="group hover:shadow-2xl transition-all duration-300 bg-white/10 backdrop-blur-md border-white/20">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-3 text-white">Key Topics</h2>
                    <div className="flex flex-wrap gap-2">
                      {journey.keyTopics.map((topic, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-white/10 text-white/90 rounded-full text-sm backdrop-blur-xl border border-white/20"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
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
                      <div className="absolute left-8 top-[4.5rem] bottom-0 w-0.5 bg-white/20" />
                    )}
                    
                    <Card className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] bg-white/10 backdrop-blur-md border-white/20">
                      <div className="p-6">
                        <div className="flex items-start gap-6">
                          <div className="flex-shrink-0 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                            {getActionIcon(step.action)}
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                              <span className="text-sm text-white/60">{step.timeEstimate}</span>
                            </div>
                            <p className="text-white/80 mb-4">{step.description}</p>
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {step.benefits.map((benefit, i) => (
                                  <span
                                    key={i}
                                    className="text-sm text-white/60 bg-white/5 px-2 py-1 rounded border border-white/10"
                                  >
                                    {benefit}
                                  </span>
                                ))}
                              </div>
                              <Button
                                onClick={() => handleActionClick(step.action)}
                                className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white font-semibold border-2 border-white/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] shadow-[0_0_15px_rgba(255,255,255,0.2)] px-6 py-2"
                              >
                                Start This Step
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-8 text-red-400">
              Failed to generate learning journey. Please try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyPlan;

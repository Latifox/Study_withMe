import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StudyTopic {
  title: string;
  keyPoints: string[];
  studyApproach: string;
  estimatedTime: string;
}

interface StudyPlan {
  title: string;
  topics: StudyTopic[];
  additionalResources: string[];
  practiceExercises: string[];
}

const Mindmap = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: studyPlan, isLoading } = useQuery({
    queryKey: ['mindmap', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<StudyPlan>("generate-mindmap", {
        body: { lectureId },
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to generate study plan. Please try again.",
          variant: "destructive",
        });
        throw error;
      }

      return data;
    },
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          onClick={() => navigate(`/course/${courseId}`)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </Button>
        <h1 className="text-3xl font-bold">Study Plan</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
          <div className="animate-pulse">Generating study plan...</div>
        </div>
      ) : studyPlan ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{studyPlan.title}</CardTitle>
            </CardHeader>
          </Card>

          {studyPlan.topics.map((topic, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-xl">{topic.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Key Points:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {topic.keyPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Study Approach:</h3>
                    <p>{topic.studyApproach}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Estimated Time:</h3>
                    <p>{topic.estimatedTime}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Additional Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1">
                {studyPlan.additionalResources.map((resource, index) => (
                  <li key={index}>{resource}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Practice Exercises</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1">
                {studyPlan.practiceExercises.map((exercise, index) => (
                  <li key={index}>{exercise}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8 text-red-500">
          Failed to generate study plan. Please try again.
        </div>
      )}
    </div>
  );
};

export default Mindmap;
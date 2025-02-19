
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import HighlightsLoading from "@/components/story/HighlightsLoading";

const LectureSummary = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const {
    data: summary,
    isLoading
  } = useQuery({
    queryKey: ['lecture-summary', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      const { data, error: functionError } = await supabase.functions.invoke('generate-summary', {
        body: { lecture_id: parseInt(lectureId) },
      });

      if (functionError) {
        console.error("Function invoke error:", functionError);
        setError("Failed to generate summary. Please try again.");
        throw functionError;
      }

      if (!data || !data.summary) {
        console.warn("No summary returned from function:", data);
        setError("No summary available for this lecture.");
        return null;
      }

      return data.summary;
    },
    meta: {
      onSettled: (data, error) => {
        if (error) {
          toast({
            title: "Error",
            description: "Failed to generate summary. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  });

  const handleBack = () => {
    navigate(`/course/${courseId}`);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Button>
        <h1 className="text-2xl font-bold">Lecture Summary</h1>
      </div>

      {isLoading ? (
        <HighlightsLoading />
      ) : summary ? (
        <Card>
          <CardHeader>
            <CardTitle>Key Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose">
              {summary}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : null}
    </div>
  );
};

export default LectureSummary;

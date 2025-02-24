
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import { useToast } from "@/components/ui/use-toast";

const LectureSummary = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: summaryData, isLoading, error } = useQuery({
    queryKey: ["lecture-summary", lectureId],
    queryFn: async () => {
      console.log('Fetching summary data...');
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId }
      });
      if (error) {
        console.error('Error fetching summary:', error);
        throw error;
      }
      console.log('Summary data received:', data);
      return data.content;
    },
    retry: false,
    meta: {
      errorMessage: "There was a problem loading the lecture summary. Please try again."
    },
    gcTime: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Use a separate useEffect to handle errors
  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error loading summary",
        description: "There was a problem loading the lecture summary. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <BackgroundGradient>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-[60vh]">
            <div className="text-center space-y-4">
              <BookOpen className="w-12 h-12 mx-auto animate-pulse text-primary" />
              <p className="text-lg text-black">Analyzing lecture content...</p>
              <p className="text-sm text-muted-foreground">Please wait while we process your request.</p>
            </div>
          </div>
        </div>
      </BackgroundGradient>
    );
  }

  if (error) {
    return (
      <BackgroundGradient>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <Button
              variant="outline"
              onClick={() => navigate(`/course/${courseId}`)}
              className="gap-2 bg-white/80 hover:bg-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Lectures
            </Button>
          </div>
          <Card className="p-6 bg-white/80 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <p className="text-lg text-black">Unable to load lecture summary</p>
              <p className="text-sm text-muted-foreground">Please try again later or contact support if the issue persists.</p>
            </div>
          </Card>
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
            className="gap-2 bg-white/80 hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lectures
          </Button>
          <Button 
            onClick={() => navigate(`/course/${courseId}/lecture/${lectureId}/highlights/fullversion`)}
            className="gap-2 bg-white/80 hover:bg-white"
          >
            Get Full Summary
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        <Card className="p-6 bg-white/80 backdrop-blur-sm">
          <div className="prose prose-sm max-w-none text-black">
            <ReactMarkdown>
              {summaryData || ''}
            </ReactMarkdown>
          </div>
        </Card>
      </div>
    </BackgroundGradient>
  );
};

export default LectureSummary;

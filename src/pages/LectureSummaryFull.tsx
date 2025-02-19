
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from "@/components/ui/card";
import BackgroundGradient from "@/components/ui/BackgroundGradient";

const LectureSummaryFull = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: lecture } = useQuery({
    queryKey: ["lecture", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("*, courses(*)")
        .eq("id", parseInt(lectureId!))
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ["lecture-summary", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId }
      });

      if (error) {
        // Check if it's a rate limit error
        if (error.status === 429) {
          throw new Error("Rate limit reached. Please wait a moment and try again.");
        }
        // Check if it's an OpenAI API error
        if (error.status === 500 && error.message.includes("OpenAI API error")) {
          throw new Error("Error generating summary. Please try again in a few moments.");
        }
        throw error;
      }
      return data.summary;
    },
    retry: (failureCount, error: any) => {
      // Don't retry on rate limit errors or OpenAI errors
      if (error?.message?.includes("Rate limit") || error?.message?.includes("OpenAI API error")) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
    meta: {
      onError: (error: Error) => {
        toast({
          title: "Error generating summary",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="text-center space-y-4">
            <BookOpen className="w-12 h-12 mx-auto animate-pulse text-primary" />
            <p className="text-lg">Generating comprehensive summary...</p>
            <p className="text-sm text-muted-foreground">This might take a moment as we analyze the lecture content.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col justify-center items-center h-[60vh] space-y-4">
          <p className="text-destructive">{error.message}</p>
          <Button
            variant="outline"
            onClick={() => navigate(`/course/${courseId}/lecture/${lectureId}/summary`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Summary
          </Button>
        </div>
      </div>
    );
  }

  return (
    <BackgroundGradient>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => navigate(`/course/${courseId}/lecture/${lectureId}/summary`)}
            className="gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-white/20 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Summary
          </Button>
        </div>

        <Card className="prose prose-sm max-w-none">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              {lecture?.title} - Full Summary
            </h1>
            <ReactMarkdown>{summary?.fullContent || ''}</ReactMarkdown>
          </CardContent>
        </Card>
      </div>
    </BackgroundGradient>
  );
};

export default LectureSummaryFull;

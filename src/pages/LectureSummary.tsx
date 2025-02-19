
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ExternalLink,
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import SummaryLoading from "@/components/story/SummaryLoading";

const LectureSummary = () => {
  const { courseId, lectureId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();

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
        if (error.status === 429) {
          throw new Error("Rate limit reached. Please wait a moment and try again.");
        }
        if (error.status === 500 && error.message.includes("OpenAI API error")) {
          throw new Error("Error generating summary. Please try again in a few moments.");
        }
        throw error;
      }
      return data.summary;
    },
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Rate limit") || error?.message?.includes("OpenAI API error")) {
        return false;
      }
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
    return <SummaryLoading />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col justify-center items-center h-[60vh] space-y-4">
          <p className="text-destructive">{error.message}</p>
          <Button
            variant="outline"
            onClick={() => navigate(`/course/${courseId}`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lectures
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
            onClick={() => navigate(`/course/${courseId}`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lectures
          </Button>
          <Button
            onClick={() => navigate(`/course/${courseId}/lecture/${lectureId}/summary/fullversion`)}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Get Full Summary
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">
                  {lecture?.title} - Summary
                </h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none prose-p:text-gray-800 prose-headings:text-blue-800">
              <ReactMarkdown>{summary?.content || ''}</ReactMarkdown>
            </CardContent>
          </Card>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default LectureSummary;

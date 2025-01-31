import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Brain, Quote, ListChecks, Lightbulb } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const { data: summary, isLoading } = useQuery({
    queryKey: ["lecture-summary", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId }
      });

      if (error) throw error;
      return data.summary;
    },
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

  return (
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
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              {lecture?.title} - Summary
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="w-5 h-5" />
                Key Concepts
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ReactMarkdown>{summary?.keyConcepts || ''}</ReactMarkdown>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Quote className="w-5 h-5" />
                Important Quotes
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ReactMarkdown>{summary?.importantQuotes || ''}</ReactMarkdown>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListChecks className="w-5 h-5" />
                Main Topics
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ReactMarkdown>{summary?.mainTopics || ''}</ReactMarkdown>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="w-5 h-5" />
                Additional Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ReactMarkdown>{summary?.additionalNotes || ''}</ReactMarkdown>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LectureSummary;
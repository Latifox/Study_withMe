import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  BookOpen, 
  ExternalLink, 
  LayoutTemplate,
  Brain,
  Lightbulb,
  Quote,
  Network,
  ClipboardList
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import { cn } from "@/lib/utils";

const LectureCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <Card className={cn(
    "bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg",
    "transition-all duration-300 hover:bg-white/30",
    className
  )}>
    {children}
  </Card>
);

const StylizedCardTitle = ({ icon: Icon, title }: { icon: React.ElementType, title: string }) => (
  <div className="flex items-center gap-3">
    <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
      <Icon className="w-5 h-5 text-yellow-400" />
    </div>
    <h3 className="text-lg font-semibold bg-gradient-to-r from-yellow-200 to-yellow-100 bg-clip-text text-transparent">
      {title}
    </h3>
  </div>
);

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
          <LectureCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
                  <BookOpen className="w-6 h-6 text-yellow-400" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-200 to-yellow-100 bg-clip-text text-transparent">
                  {lecture?.title} - Summary
                </h2>
              </CardTitle>
            </CardHeader>
          </LectureCard>

          <div className="grid gap-6 md:grid-cols-2">
            <LectureCard>
              <CardHeader>
                <StylizedCardTitle icon={LayoutTemplate} title="Structure" />
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none prose-invert prose-p:text-gray-200 prose-strong:text-yellow-200 prose-headings:text-yellow-100">
                <ReactMarkdown>{summary?.structure || ''}</ReactMarkdown>
              </CardContent>
            </LectureCard>

            <LectureCard>
              <CardHeader>
                <StylizedCardTitle icon={Brain} title="Key Concepts" />
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none prose-invert prose-p:text-gray-200 prose-strong:text-yellow-200 prose-headings:text-yellow-100">
                <ReactMarkdown>{summary?.keyConcepts || ''}</ReactMarkdown>
              </CardContent>
            </LectureCard>

            <LectureCard>
              <CardHeader>
                <StylizedCardTitle icon={Lightbulb} title="Main Ideas" />
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none prose-invert prose-p:text-gray-200 prose-strong:text-yellow-200 prose-headings:text-yellow-100">
                <ReactMarkdown>{summary?.mainIdeas || ''}</ReactMarkdown>
              </CardContent>
            </LectureCard>

            <LectureCard>
              <CardHeader>
                <StylizedCardTitle icon={Quote} title="Important Quotes" />
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none prose-invert prose-p:text-gray-200 prose-strong:text-yellow-200 prose-headings:text-yellow-100">
                <ReactMarkdown>{summary?.importantQuotes || ''}</ReactMarkdown>
              </CardContent>
            </LectureCard>

            <LectureCard>
              <CardHeader>
                <StylizedCardTitle icon={Network} title="Relationships and Connections" />
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none prose-invert prose-p:text-gray-200 prose-strong:text-yellow-200 prose-headings:text-yellow-100">
                <ReactMarkdown>{summary?.relationships || ''}</ReactMarkdown>
              </CardContent>
            </LectureCard>

            <LectureCard>
              <CardHeader>
                <StylizedCardTitle icon={ClipboardList} title="Supporting Evidence & Examples" />
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none prose-invert prose-p:text-gray-200 prose-strong:text-yellow-200 prose-headings:text-yellow-100">
                <ReactMarkdown>{summary?.supportingEvidence || ''}</ReactMarkdown>
              </CardContent>
            </LectureCard>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default LectureSummary;

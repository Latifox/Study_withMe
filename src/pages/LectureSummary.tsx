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
  ClipboardList,
  ChevronDown
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import { cn } from "@/lib/utils";
import { useState } from "react";
import AIProfessorLoading from "@/components/AIProfessorLoading";

const LectureCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <Card className={cn(
    "bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg",
    "transition-all duration-300 hover:bg-white/30",
    className
  )}>
    {children}
  </Card>
);

const StylizedCardTitle = ({ icon: Icon, title, isOpen }: { icon: React.ElementType, title: string, isOpen: boolean }) => (
  <div className="flex items-center gap-3 cursor-pointer w-full">
    <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
      <Icon className="w-5 h-5 text-black" />
    </div>
    <h3 className="text-lg font-bold text-black flex-1">
      {title}
    </h3>
    <ChevronDown className={cn(
      "w-5 h-5 text-black transition-transform duration-200",
      isOpen && "transform rotate-180"
    )} />
  </div>
);

interface CollapsibleCardProps {
  icon: React.ElementType;
  title: string;
  content: string;
}

const CollapsibleCard = ({ icon, title, content }: CollapsibleCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <LectureCard>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <CardHeader>
            <StylizedCardTitle icon={icon} title={title} isOpen={isOpen} />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="prose prose-sm max-w-none prose-invert prose-p:text-gray-800 prose-strong:text-blue-700 prose-headings:text-blue-800">
            <ReactMarkdown>{content || ''}</ReactMarkdown>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </LectureCard>
  );
};

const LectureSummary = () => {
  const { courseId, lectureId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!lectureId) {
    return <div>Lecture ID is required</div>;
  }

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
    return <AIProfessorLoading lectureId={lectureId} />;
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
                  <BookOpen className="w-6 h-6 text-black" />
                </div>
                <h2 className="text-2xl font-bold text-black">
                  {lecture?.title} - Summary
                </h2>
              </CardTitle>
            </CardHeader>
          </LectureCard>

          <div className="grid gap-6 md:grid-cols-2">
            <CollapsibleCard
              icon={LayoutTemplate}
              title="Structure"
              content={summary?.structure || ''}
            />
            <CollapsibleCard
              icon={Brain}
              title="Key Concepts"
              content={summary?.keyConcepts || ''}
            />
            <CollapsibleCard
              icon={Lightbulb}
              title="Main Ideas"
              content={summary?.mainIdeas || ''}
            />
            <CollapsibleCard
              icon={Quote}
              title="Important Quotes"
              content={summary?.importantQuotes || ''}
            />
            <CollapsibleCard
              icon={Network}
              title="Relationships and Connections"
              content={summary?.relationships || ''}
            />
            <CollapsibleCard
              icon={ClipboardList}
              title="Supporting Evidence & Examples"
              content={summary?.supportingEvidence || ''}
            />
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default LectureSummary;

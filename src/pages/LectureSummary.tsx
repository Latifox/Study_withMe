
import { useState } from "react";
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
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import { cn } from "@/lib/utils";
import HighlightsLoading from "@/components/HighlightsLoading";

interface Section {
  icon: React.ElementType;
  title: string;
  content: string;
  key: string;
}

const sections: Section[] = [
  { icon: LayoutTemplate, title: "Structure", content: "", key: "structure" },
  { icon: Brain, title: "Key Concepts", content: "", key: "keyConcepts" },
  { icon: Lightbulb, title: "Main Ideas", content: "", key: "mainIdeas" },
  { icon: Quote, title: "Important Quotes", content: "", key: "importantQuotes" },
  { icon: Network, title: "Relationships", content: "", key: "relationships" },
  { icon: ClipboardList, title: "Supporting Evidence", content: "", key: "supportingEvidence" }
];

const LectureSummary = () => {
  const { courseId, lectureId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<string>("structure");

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
    return <HighlightsLoading />;
  }

  const sectionsWithContent = sections.map(section => ({
    ...section,
    content: summary?.[section.key] || ''
  }));

  const selectedSectionContent = sectionsWithContent.find(s => s.key === selectedSection);

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
            onClick={() => navigate(`/course/${courseId}/lecture/${lectureId}/highlights/fullversion`)}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Get Full Summary
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Column - Section List */}
          <div className="w-full md:w-1/3 space-y-4">
            <Card className="bg-white/20 backdrop-blur-sm border border-white/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
                    <BookOpen className="w-6 h-6 text-black" />
                  </div>
                  <h2 className="text-xl font-bold text-black">
                    {lecture?.title} - Highlights
                  </h2>
                </CardTitle>
              </CardHeader>
            </Card>

            {sectionsWithContent.map((section) => (
              <Card
                key={section.key}
                className={cn(
                  "bg-white/20 backdrop-blur-sm border border-white/30 cursor-pointer transition-all duration-200",
                  selectedSection === section.key ? "ring-2 ring-purple-500" : "hover:bg-white/30"
                )}
                onClick={() => setSelectedSection(section.key)}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
                      <section.icon className="w-5 h-5 text-black" />
                    </div>
                    <h3 className="text-lg font-bold text-black">
                      {section.title}
                    </h3>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Right Column - Content Display */}
          <div className="w-full md:w-2/3">
            <Card className="bg-white/20 backdrop-blur-sm border border-white/30">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-black">
                  {selectedSectionContent?.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none prose-invert prose-p:text-gray-800 prose-strong:text-blue-700 prose-headings:text-blue-800">
                <ReactMarkdown>{selectedSectionContent?.content || ''}</ReactMarkdown>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default LectureSummary;

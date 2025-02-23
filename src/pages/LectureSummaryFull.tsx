
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

  const { data: part1Data, isLoading: isLoadingPart1 } = useQuery({
    queryKey: ["lecture-summary-part1", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId, part: 'part1' }
      });
      if (error) throw error;
      return data.content;
    },
  });

  const { data: part2Data, isLoading: isLoadingPart2 } = useQuery({
    queryKey: ["lecture-summary-part2", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId, part: 'part2' }
      });
      if (error) throw error;
      return data.content;
    },
  });

  const { data: fullContent, isLoading: isLoadingFull } = useQuery({
    queryKey: ["lecture-summary-full", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId, part: 'full' }
      });
      if (error) throw error;
      return data.content;
    },
  });

  const isLoading = isLoadingPart1 || isLoadingPart2 || isLoadingFull;

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
    <BackgroundGradient>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => navigate(`/course/${courseId}/lecture/${lectureId}/highlights`)}
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
            
            {/* Structure Section */}
            <h2 className="text-xl font-semibold mt-8">Structure</h2>
            <ReactMarkdown>{part1Data?.structure || ''}</ReactMarkdown>

            {/* Key Concepts Section */}
            <h2 className="text-xl font-semibold mt-8">Key Concepts</h2>
            {Object.entries(part1Data?.keyConcepts || {}).map(([concept, explanation], idx) => (
              <div key={idx} className="mb-4">
                <h3 className="font-medium text-lg">{concept}</h3>
                <p>{explanation}</p>
              </div>
            ))}

            {/* Main Ideas Section */}
            <h2 className="text-xl font-semibold mt-8">Main Ideas</h2>
            {Object.entries(part1Data?.mainIdeas || {}).map(([idea, explanation], idx) => (
              <div key={idx} className="mb-4">
                <h3 className="font-medium text-lg">{idea}</h3>
                <p>{explanation}</p>
              </div>
            ))}

            {/* Important Quotes Section */}
            <h2 className="text-xl font-semibold mt-8">Important Quotes</h2>
            {Object.entries(part2Data?.importantQuotes || {}).map(([context, quote], idx) => (
              <div key={idx} className="mb-4">
                <h3 className="font-medium text-lg">{context}</h3>
                <blockquote className="border-l-4 border-gray-200 pl-4 italic">{quote}</blockquote>
              </div>
            ))}

            {/* Relationships Section */}
            <h2 className="text-xl font-semibold mt-8">Relationships</h2>
            {Object.entries(part2Data?.relationships || {}).map(([connection, explanation], idx) => (
              <div key={idx} className="mb-4">
                <h3 className="font-medium text-lg">{connection}</h3>
                <p>{explanation}</p>
              </div>
            ))}

            {/* Supporting Evidence Section */}
            <h2 className="text-xl font-semibold mt-8">Supporting Evidence</h2>
            {Object.entries(part2Data?.supportingEvidence || {}).map(([evidence, explanation], idx) => (
              <div key={idx} className="mb-4">
                <h3 className="font-medium text-lg">{evidence}</h3>
                <p>{explanation}</p>
              </div>
            ))}

            {/* Full Content Section */}
            <h2 className="text-xl font-semibold mt-8">Comprehensive Summary</h2>
            <ReactMarkdown>{fullContent?.fullContent || ''}</ReactMarkdown>
          </CardContent>
        </Card>
      </div>
    </BackgroundGradient>
  );
};

export default LectureSummaryFull;

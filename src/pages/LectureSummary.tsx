
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import BackgroundGradient from "@/components/ui/BackgroundGradient";

interface Part1Response {
  structure: string;
  keyConcepts: Record<string, string>;
  mainIdeas: Record<string, string>;
}

interface Part2Response {
  importantQuotes: Record<string, string>;
  relationships: Record<string, string>;
  supportingEvidence: Record<string, string>;
}

const LectureSummary = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();

  const { data: part1Data, isLoading: isLoadingPart1 } = useQuery<{ content: Part1Response }>({
    queryKey: ["lecture-summary-part1", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId, part: 'part1' }
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: part2Data, isLoading: isLoadingPart2 } = useQuery<{ content: Part2Response }>({
    queryKey: ["lecture-summary-part2", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId, part: 'part2' }
      });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = isLoadingPart1 || isLoadingPart2;

  if (isLoading) {
    return (
      <BackgroundGradient>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-[60vh]">
            <div className="text-center space-y-4">
              <BookOpen className="w-12 h-12 mx-auto animate-pulse text-white" />
              <p className="text-lg text-white">Generating lecture summary...</p>
              <p className="text-sm text-white/80">This might take a moment as we analyze the content.</p>
            </div>
          </div>
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
            className="gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-white/20 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lectures
          </Button>
          <Button 
            onClick={() => navigate(`/course/${courseId}/lecture/${lectureId}/highlights/fullversion`)}
            className="gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold border-2 border-white/30"
          >
            Get Full Summary
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Structure */}
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
                <BookOpen className="w-5 h-5" />
                Structure
              </h2>
              <div className="text-white/90">
                <ReactMarkdown>{part1Data?.content?.structure || ''}</ReactMarkdown>
              </div>
            </Card>

            {/* Key Concepts */}
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
              <h2 className="text-xl font-semibold mb-4 text-white">Key Concepts</h2>
              <div className="space-y-4">
                {Object.entries(part1Data?.content?.keyConcepts || {}).map(([concept, explanation], idx) => (
                  <div key={idx} className="border-l-2 border-white/20 pl-4">
                    <h3 className="font-medium text-white/90">{concept}</h3>
                    <p className="text-white/80 text-sm mt-1">{String(explanation)}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Main Ideas */}
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
              <h2 className="text-xl font-semibold mb-4 text-white">Main Ideas</h2>
              <div className="space-y-4">
                {Object.entries(part1Data?.content?.mainIdeas || {}).map(([idea, explanation], idx) => (
                  <div key={idx} className="border-l-2 border-white/20 pl-4">
                    <h3 className="font-medium text-white/90">{idea}</h3>
                    <p className="text-white/80 text-sm mt-1">{String(explanation)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Important Quotes */}
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
              <h2 className="text-xl font-semibold mb-4 text-white">Important Quotes</h2>
              <div className="space-y-4">
                {Object.entries(part2Data?.content?.importantQuotes || {}).map(([context, quote], idx) => (
                  <div key={idx} className="border-l-2 border-white/20 pl-4">
                    <h3 className="font-medium text-white/90">{context}</h3>
                    <blockquote className="text-white/80 text-sm mt-1 italic">{String(quote)}</blockquote>
                  </div>
                ))}
              </div>
            </Card>

            {/* Relationships */}
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
              <h2 className="text-xl font-semibold mb-4 text-white">Relationships</h2>
              <div className="space-y-4">
                {Object.entries(part2Data?.content?.relationships || {}).map(([connection, explanation], idx) => (
                  <div key={idx} className="border-l-2 border-white/20 pl-4">
                    <h3 className="font-medium text-white/90">{connection}</h3>
                    <p className="text-white/80 text-sm mt-1">{String(explanation)}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Supporting Evidence */}
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
              <h2 className="text-xl font-semibold mb-4 text-white">Supporting Evidence</h2>
              <div className="space-y-4">
                {Object.entries(part2Data?.content?.supportingEvidence || {}).map(([evidence, explanation], idx) => (
                  <div key={idx} className="border-l-2 border-white/20 pl-4">
                    <h3 className="font-medium text-white/90">{evidence}</h3>
                    <p className="text-white/80 text-sm mt-1">{String(explanation)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default LectureSummary;

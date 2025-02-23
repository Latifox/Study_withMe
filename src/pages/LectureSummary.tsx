
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

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

type Section = 'structure' | 'keyConcepts' | 'mainIdeas' | 'importantQuotes' | 'relationships' | 'supportingEvidence';

const LectureSummary = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<Section>('structure');

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
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="text-center space-y-4">
            <BookOpen className="w-12 h-12 mx-auto animate-pulse text-primary" />
            <p className="text-lg text-black">Generating lecture summary...</p>
            <p className="text-sm text-muted-foreground">This might take a moment as we analyze the content.</p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (selectedSection) {
      case 'structure':
        return (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{part1Data?.content?.structure || ''}</ReactMarkdown>
          </div>
        );
      case 'keyConcepts':
        return (
          <div className="space-y-4">
            {Object.entries(part1Data?.content?.keyConcepts || {}).map(([concept, explanation], idx) => (
              <div key={idx} className="border-l-2 border-primary pl-4">
                <h3 className="font-medium text-black">{concept}</h3>
                <p className="text-gray-700 mt-1">{String(explanation)}</p>
              </div>
            ))}
          </div>
        );
      case 'mainIdeas':
        return (
          <div className="space-y-4">
            {Object.entries(part1Data?.content?.mainIdeas || {}).map(([idea, explanation], idx) => (
              <div key={idx} className="border-l-2 border-primary pl-4">
                <h3 className="font-medium text-black">{idea}</h3>
                <p className="text-gray-700 mt-1">{String(explanation)}</p>
              </div>
            ))}
          </div>
        );
      case 'importantQuotes':
        return (
          <div className="space-y-4">
            {Object.entries(part2Data?.content?.importantQuotes || {}).map(([context, quote], idx) => (
              <div key={idx} className="border-l-2 border-primary pl-4">
                <h3 className="font-medium text-black">{context}</h3>
                <blockquote className="text-gray-700 mt-1 italic">{String(quote)}</blockquote>
              </div>
            ))}
          </div>
        );
      case 'relationships':
        return (
          <div className="space-y-4">
            {Object.entries(part2Data?.content?.relationships || {}).map(([connection, explanation], idx) => (
              <div key={idx} className="border-l-2 border-primary pl-4">
                <h3 className="font-medium text-black">{connection}</h3>
                <p className="text-gray-700 mt-1">{String(explanation)}</p>
              </div>
            ))}
          </div>
        );
      case 'supportingEvidence':
        return (
          <div className="space-y-4">
            {Object.entries(part2Data?.content?.supportingEvidence || {}).map(([evidence, explanation], idx) => (
              <div key={idx} className="border-l-2 border-primary pl-4">
                <h3 className="font-medium text-black">{evidence}</h3>
                <p className="text-gray-700 mt-1">{String(explanation)}</p>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
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
          Get Full Summary
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Navigation Cards */}
        <div className="space-y-4">
          <Card 
            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedSection === 'structure' ? 'bg-gray-50 border-primary' : 'bg-white'}`}
            onClick={() => setSelectedSection('structure')}
          >
            <h2 className="text-lg font-semibold text-black">Structure</h2>
          </Card>

          <Card 
            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedSection === 'keyConcepts' ? 'bg-gray-50 border-primary' : 'bg-white'}`}
            onClick={() => setSelectedSection('keyConcepts')}
          >
            <h2 className="text-lg font-semibold text-black">Key Concepts</h2>
          </Card>

          <Card 
            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedSection === 'mainIdeas' ? 'bg-gray-50 border-primary' : 'bg-white'}`}
            onClick={() => setSelectedSection('mainIdeas')}
          >
            <h2 className="text-lg font-semibold text-black">Main Ideas</h2>
          </Card>

          <Card 
            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedSection === 'importantQuotes' ? 'bg-gray-50 border-primary' : 'bg-white'}`}
            onClick={() => setSelectedSection('importantQuotes')}
          >
            <h2 className="text-lg font-semibold text-black">Important Quotes</h2>
          </Card>

          <Card 
            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedSection === 'relationships' ? 'bg-gray-50 border-primary' : 'bg-white'}`}
            onClick={() => setSelectedSection('relationships')}
          >
            <h2 className="text-lg font-semibold text-black">Relationships</h2>
          </Card>

          <Card 
            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedSection === 'supportingEvidence' ? 'bg-gray-50 border-primary' : 'bg-white'}`}
            onClick={() => setSelectedSection('supportingEvidence')}
          >
            <h2 className="text-lg font-semibold text-black">Supporting Evidence</h2>
          </Card>
        </div>

        {/* Right Column - Content Display */}
        <div className="md:col-span-2">
          <Card className="p-6 bg-white">
            <div className="text-black">
              {renderContent()}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LectureSummary;

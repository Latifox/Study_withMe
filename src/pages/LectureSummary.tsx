
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import BackgroundGradient from "@/components/ui/BackgroundGradient";

type Section = 'structure' | 'keyConcepts' | 'mainIdeas' | 'importantQuotes' | 'relationships' | 'supportingEvidence';

const LectureSummary = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<Section>('structure');

  // Group 1: Structure and Key Concepts
  const { data: group1Data, isLoading: isLoadingGroup1 } = useQuery({
    queryKey: ["lecture-summary-group1", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId, sections: ['structure', 'keyConcepts'] }
      });
      if (error) throw error;
      return data.content;
    },
  });

  // Group 2: Main Ideas and Important Quotes
  const { data: group2Data, isLoading: isLoadingGroup2 } = useQuery({
    queryKey: ["lecture-summary-group2", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId, sections: ['mainIdeas', 'importantQuotes'] }
      });
      if (error) throw error;
      return data.content;
    },
  });

  // Group 3: Relationships and Supporting Evidence
  const { data: group3Data, isLoading: isLoadingGroup3 } = useQuery({
    queryKey: ["lecture-summary-group3", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId, sections: ['relationships', 'supportingEvidence'] }
      });
      if (error) throw error;
      return data.content;
    },
  });

  const isLoading = isLoadingGroup1 || isLoadingGroup2 || isLoadingGroup3;

  // Combine all data for easy access
  const summaryData = {
    structure: group1Data?.structure || '',
    keyConcepts: group1Data?.keyConcepts || {},
    mainIdeas: group2Data?.mainIdeas || {},
    importantQuotes: group2Data?.importantQuotes || {},
    relationships: group3Data?.relationships || {},
    supportingEvidence: group3Data?.supportingEvidence || {}
  };

  if (isLoading) {
    return (
      <BackgroundGradient>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-[60vh]">
            <div className="text-center space-y-4">
              <BookOpen className="w-12 h-12 mx-auto animate-pulse text-primary" />
              <p className="text-lg text-black">Generating lecture summary...</p>
              <p className="text-sm text-muted-foreground">This might take a moment as we analyze the content.</p>
            </div>
          </div>
        </div>
      </BackgroundGradient>
    );
  }

  const renderContent = () => {
    switch (selectedSection) {
      case 'structure':
        return (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{summaryData.structure}</ReactMarkdown>
          </div>
        );
      case 'keyConcepts':
        return (
          <div className="space-y-4">
            {Object.entries(summaryData.keyConcepts).map(([concept, explanation], idx) => (
              <div key={idx} className="border-l-2 border-primary pl-4">
                <h3 className="font-semibold text-lg text-black">{concept}</h3>
                <p className="text-gray-700 mt-1">{String(explanation)}</p>
              </div>
            ))}
          </div>
        );
      case 'mainIdeas':
        return (
          <div className="space-y-4">
            {Object.entries(summaryData.mainIdeas).map(([idea, explanation], idx) => (
              <div key={idx} className="border-l-2 border-primary pl-4">
                <h3 className="font-semibold text-lg text-black">{idea}</h3>
                <p className="text-gray-700 mt-1">{String(explanation)}</p>
              </div>
            ))}
          </div>
        );
      case 'importantQuotes':
        return (
          <div className="space-y-6">
            {Object.entries(summaryData.importantQuotes).map(([context, quote], idx) => (
              <div key={idx} className="bg-white/50 rounded-lg p-4 shadow-sm">
                <h3 className="font-bold text-lg text-black mb-2 pb-2 border-b border-primary/20">{context}</h3>
                <blockquote className="text-gray-700 mt-1 italic pl-4 border-l-4 border-primary/30">
                  {String(quote)}
                </blockquote>
              </div>
            ))}
          </div>
        );
      case 'relationships':
        return (
          <div className="space-y-6">
            {Object.entries(summaryData.relationships).map(([connection, explanation], idx) => (
              <div key={idx} className="bg-white/50 rounded-lg p-4 shadow-sm">
                <h3 className="font-bold text-lg text-black mb-2 pb-2 border-b border-primary/20">{connection}</h3>
                <p className="text-gray-700 mt-1">{String(explanation)}</p>
              </div>
            ))}
          </div>
        );
      case 'supportingEvidence':
        return (
          <div className="space-y-6">
            {Object.entries(summaryData.supportingEvidence).map(([evidence, explanation], idx) => (
              <div key={idx} className="bg-white/50 rounded-lg p-4 shadow-sm">
                <h3 className="font-bold text-lg text-black mb-2 pb-2 border-b border-primary/20">{evidence}</h3>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Navigation Cards */}
          <div className="space-y-4">
            {[
              { id: 'structure', label: 'Structure' },
              { id: 'keyConcepts', label: 'Key Concepts' },
              { id: 'mainIdeas', label: 'Main Ideas' },
              { id: 'importantQuotes', label: 'Important Quotes' },
              { id: 'relationships', label: 'Relationships' },
              { id: 'supportingEvidence', label: 'Supporting Evidence' }
            ].map(({ id, label }) => (
              <Card 
                key={id}
                className={`p-4 cursor-pointer hover:bg-white/80 transition-colors backdrop-blur-sm ${
                  selectedSection === id ? 'bg-white/80 border-primary shadow-md' : 'bg-white/50'
                }`}
                onClick={() => setSelectedSection(id as Section)}
              >
                <h2 className="text-lg font-semibold text-black">{label}</h2>
              </Card>
            ))}
          </div>

          {/* Right Column - Content Display */}
          <div className="md:col-span-2">
            <Card className="p-6 bg-white/80 backdrop-blur-sm">
              <div className="text-black">
                {renderContent()}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default LectureSummary;


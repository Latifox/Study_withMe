
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import BackgroundGradient from "@/components/ui/BackgroundGradient";

type Category = 'structure' | 'keyConcepts' | 'mainIdeas' | 'importantQuotes' | 'relationships' | 'supportingEvidence';

type SummaryContent = {
  [key in Category]: string;
};

const LectureSummary = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>('structure');

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

  const isLoading = isLoadingPart1 || isLoadingPart2;
  
  const summaryData = {
    ...part1Data,
    ...part2Data
  };

  if (isLoading) {
    return (
      <BackgroundGradient>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-[60vh]">
            <div className="text-center space-y-4">
              <BookOpen className="w-12 h-12 mx-auto animate-pulse text-primary" />
              <p className="text-lg text-black">Analyzing lecture content...</p>
              <p className="text-sm text-muted-foreground">Please wait while we process your request.</p>
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
                  selectedCategory === id ? 'bg-white/80 border-primary shadow-md' : 'bg-white/50'
                }`}
                onClick={() => setSelectedCategory(id as Category)}
              >
                <h2 className="text-lg font-semibold text-black">{label}</h2>
              </Card>
            ))}
          </div>

          {/* Right Column - Content Display */}
          <div className="md:col-span-2">
            <Card className="p-6 bg-white/80 backdrop-blur-sm">
              <div className="prose prose-sm max-w-none text-black">
                <ReactMarkdown>
                  {summaryData?.[selectedCategory] || ''}
                </ReactMarkdown>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default LectureSummary;

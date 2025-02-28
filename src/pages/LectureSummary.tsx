
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import { useToast } from "@/components/ui/use-toast";

type Category = 'structure' | 'keyConcepts' | 'mainIdeas' | 'importantQuotes' | 'relationships' | 'supportingEvidence';

type SummaryContent = {
  [key in Category]: string;
};

const LectureSummary = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>('structure');
  const { toast } = useToast();

  // Fetch lecture data to ensure we have access to it
  const { data: lecture } = useQuery({
    queryKey: ["lecture", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .eq("id", parseInt(lectureId!))
        .single();

      if (error) throw error;
      return data;
    },
  });

  // First set of highlights (first three cards)
  const { data: firstHighlights, isLoading: isLoadingFirst } = useQuery({
    queryKey: ["lecture-highlights-first", lectureId],
    queryFn: async () => {
      console.log('Generating first set of highlights...');
      const { data: existingHighlights } = await supabase
        .from("lecture_highlights")
        .select("structure, key_concepts, main_ideas")
        .eq("lecture_id", parseInt(lectureId!))
        .maybeSingle();

      if (existingHighlights?.structure) {
        console.log('Found existing first highlights');
        return existingHighlights;
      }

      console.log('Generating new first highlights...');
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId, part: 'first-cards' }
      });

      if (error) throw error;
      return data.content;
    },
    enabled: !!lecture
  });

  // Second set of highlights (last three cards)
  const { data: secondHighlights, isLoading: isLoadingSecond } = useQuery({
    queryKey: ["lecture-highlights-second", lectureId],
    queryFn: async () => {
      console.log('Generating second set of highlights...');
      const { data: existingHighlights } = await supabase
        .from("lecture_highlights")
        .select("important_quotes, relationships, supporting_evidence")
        .eq("lecture_id", parseInt(lectureId!))
        .maybeSingle();

      if (existingHighlights?.important_quotes) {
        console.log('Found existing second highlights');
        return existingHighlights;
      }

      console.log('Generating new second highlights...');
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId, part: 'second-cards' }
      });

      if (error) throw error;
      return data.content;
    },
    enabled: !!lecture
  });

  const isLoading = isLoadingFirst || isLoadingSecond;

  // Combine both sets of highlights
  const summaryData: SummaryContent = {
    structure: firstHighlights?.structure || '',
    keyConcepts: firstHighlights?.key_concepts || '',
    mainIdeas: firstHighlights?.main_ideas || '',
    importantQuotes: secondHighlights?.important_quotes || '',
    relationships: secondHighlights?.relationships || '',
    supportingEvidence: secondHighlights?.supporting_evidence || ''
  };

  if (isLoading) {
    return (
      <BackgroundGradient>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-[60vh]">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <p className="text-lg text-black">Generating highlights...</p>
              <p className="text-sm text-muted-foreground">
                This may take a moment as we analyze the lecture content.
              </p>
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
            className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-none"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lectures
          </Button>
          <Button 
            variant="outline"
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
            <Card className="p-6 bg-white/30 backdrop-blur-md border border-white/20">
              <div className="prose prose-sm max-w-none text-black">
                <ReactMarkdown>
                  {summaryData[selectedCategory]}
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


import { useParams, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
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
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: highlights, isLoading, error } = useQuery({
    queryKey: ["lecture-highlights", lectureId],
    queryFn: async () => {
      console.log('Fetching lecture highlights...');
      const { data, error } = await supabase
        .from("lecture_highlights")
        .select("*")
        .eq("lecture_id", parseInt(lectureId!))
        .maybeSingle();

      if (error) {
        console.error('Error fetching highlights:', error);
        throw error;
      }
      
      console.log('Highlights received:', data);

      if (!data) {
        console.log('No highlights found, generating...');
        setIsGenerating(true);
        
        try {
          const { data: generatedData, error: generateError } = await supabase.functions.invoke(
            'generate-lecture-summary',
            {
              body: { lectureId: parseInt(lectureId!), part: 'highlights' }
            }
          );

          if (generateError) {
            console.error('Error generating highlights:', generateError);
            throw generateError;
          }

          // After generation, fetch the newly created highlights
          const { data: newHighlights, error: fetchError } = await supabase
            .from("lecture_highlights")
            .select("*")
            .eq("lecture_id", parseInt(lectureId!))
            .maybeSingle();

          if (fetchError) {
            console.error('Error fetching new highlights:', fetchError);
            throw fetchError;
          }

          setIsGenerating(false);
          return newHighlights;
        } catch (err) {
          setIsGenerating(false);
          throw err;
        }
      }

      return data;
    },
    retry: 1,
    onError: (err) => {
      toast({
        title: "Error loading summary",
        description: "There was a problem loading the lecture summary. Please try again.",
        variant: "destructive",
      });
    }
  });

  const summaryData: SummaryContent = {
    structure: highlights?.structure || '',
    keyConcepts: highlights?.key_concepts || '',
    mainIdeas: highlights?.main_ideas || '',
    importantQuotes: highlights?.important_quotes || '',
    relationships: highlights?.relationships || '',
    supportingEvidence: highlights?.supporting_evidence || ''
  };

  if (isLoading || isGenerating) {
    return (
      <BackgroundGradient>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-[60vh]">
            <div className="text-center space-y-4">
              <BookOpen className="w-12 h-12 mx-auto animate-pulse text-primary" />
              <p className="text-lg text-black">
                {isGenerating ? "Generating highlights..." : "Loading highlights..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {isGenerating 
                  ? "Please wait while we analyze the lecture content."
                  : "Please wait while we load your request."}
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

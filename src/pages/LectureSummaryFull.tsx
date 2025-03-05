
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from "@/components/ui/card";
import StoryBackground from "@/components/ui/StoryBackground";
import { useToast } from "@/components/ui/use-toast";

const LectureSummaryFull = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // First, check if we have an existing full summary
  const { data: fullSummary, isLoading } = useQuery({
    queryKey: ["lecture-summary-full", lectureId],
    queryFn: async () => {
      console.log('Fetching full lecture summary...');
      
      // Check for existing summary
      const { data: existingHighlight } = await supabase
        .from("lecture_highlights")
        .select("full_content, lectures(title)")
        .eq("lecture_id", parseInt(lectureId!))
        .maybeSingle();

      if (existingHighlight?.full_content) {
        console.log('Found existing full summary');
        return {
          full_content: existingHighlight.full_content,
          lecture_title: existingHighlight.lectures?.title
        };
      }

      // Generate new summary
      console.log('Generating new full summary...');
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { 
          lectureId,
          part: 'full'
        }
      });
      
      if (error) {
        console.error('Error fetching full summary:', error);
        toast({
          title: "Error loading summary",
          description: "There was a problem loading the full lecture summary. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
      
      // Fetch the lecture title
      const { data: lecture } = await supabase
        .from("lectures")
        .select("title")
        .eq("id", parseInt(lectureId!))
        .single();
      
      return {
        full_content: data.content.full_content,
        lecture_title: lecture?.title
      };
    },
  });

  if (isLoading) {
    return (
      <StoryBackground>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-[60vh]">
            <div className="text-center space-y-4">
              <BookOpen className="w-12 h-12 mx-auto animate-pulse text-primary" />
              <p className="text-lg text-black">Generating comprehensive summary...</p>
              <p className="text-sm text-muted-foreground">This might take a moment as we analyze the lecture content.</p>
            </div>
          </div>
        </div>
      </StoryBackground>
    );
  }

  return (
    <StoryBackground>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => navigate(`/course/${courseId}/lecture/${lectureId}/highlights`)}
            className="gap-2 bg-white/80 hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Summary
          </Button>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-black">
              <BookOpen className="w-6 h-6" />
              {fullSummary?.lecture_title} - Full Summary
            </h1>
            
            <div className="prose prose-sm max-w-none text-black">
              <ReactMarkdown>
                {fullSummary?.full_content || ''}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    </StoryBackground>
  );
};

export default LectureSummaryFull;

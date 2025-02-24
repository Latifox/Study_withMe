
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from "@/components/ui/card";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import { useToast } from "@/components/ui/use-toast";

const LectureSummaryFull = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // First, fetch the lecture data
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

  // Then use the lecture data to generate the full summary
  const { data: fullSummary, isLoading } = useQuery({
    queryKey: ["lecture-summary-full", lectureId],
    queryFn: async () => {
      console.log('Fetching full lecture summary...');
      console.log('Lecture content available:', !!lecture?.content);
      
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { 
          lectureId,
          part: 'full',
          lectureContent: lecture?.content // Pass the lecture content to the Edge Function
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
      
      console.log('Full summary received:', data);
      return data.content;
    },
    enabled: !!lecture, // Only run this query when lecture data is available
  });

  if (isLoading) {
    return (
      <BackgroundGradient>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-[60vh]">
            <div className="text-center space-y-4">
              <BookOpen className="w-12 h-12 mx-auto animate-pulse text-primary" />
              <p className="text-lg text-black">Generating comprehensive summary...</p>
              <p className="text-sm text-muted-foreground">This might take a moment as we analyze the lecture content.</p>
            </div>
          </div>
        </div>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
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
              {lecture?.title} - Full Summary
            </h1>
            
            <div className="prose prose-sm max-w-none text-black">
              <ReactMarkdown>
                {fullSummary?.full_content || ''}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    </BackgroundGradient>
  );
};

export default LectureSummaryFull;


import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from 'react-markdown';

const LectureSummary = () => {
  const { courseId, lectureId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();

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

      if (error) throw error;
      return data.summary;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-[60vh]">
          <p className="text-lg">Generating summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Button
        variant="outline"
        onClick={() => navigate(`/course/${courseId}`)}
        className="mb-4 gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Lectures
      </Button>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">
          {lecture?.title} - Summary
        </h1>
        <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none">
          <ReactMarkdown>{summary || ''}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default LectureSummary;
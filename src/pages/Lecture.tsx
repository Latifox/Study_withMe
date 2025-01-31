import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PDFViewer from "@/components/PDFViewer";
import ChatMessage from "@/components/ChatMessage";
import QuizConfiguration from "@/components/QuizConfiguration";

const Lecture = () => {
  const { lectureId } = useParams();
  const [searchParams] = useSearchParams();
  const action = searchParams.get("action");

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

  if (!lecture) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {action === "quiz" ? (
        <QuizConfiguration lectureId={parseInt(lectureId!)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-[calc(100vh-2rem)]">
            <PDFViewer lectureId={lectureId} />
          </div>
          <div className="h-[calc(100vh-2rem)] bg-white rounded-lg shadow p-4">
            <div className="flex flex-col gap-4">
              <ChatMessage message={{ role: 'assistant', content: 'Hello! How can I help you with this lecture?' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lecture;
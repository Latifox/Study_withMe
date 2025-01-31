import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PDFViewer from "@/components/PDFViewer";
import ChatMessage from "@/components/ChatMessage";
import QuizConfiguration from "@/components/QuizConfiguration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const Lecture = () => {
  const { lectureId } = useParams();
  const [searchParams] = useSearchParams();
  const action = searchParams.get("action");
  const { toast } = useToast();

  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    { role: 'assistant', content: 'Hello! How can I help you with this lecture?' }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [isSummaryLoading, setSummaryLoading] = useState(false);

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

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
      
      const { data, error } = await supabase.functions.invoke('chat-with-lecture', {
        body: { lectureId, message: inputMessage }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      setInputMessage("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId }
      });

      if (error) throw error;
      setSummary(data.summary);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (action === 'summary') {
      fetchSummary();
    }
  }, [action, lectureId]);

  if (!lecture) {
    return <div>Loading...</div>;
  }

  const renderContent = () => {
    switch (action) {
      case 'summary':
        return (
          <div className="h-[calc(100vh-2rem)] bg-white rounded-lg shadow p-4 overflow-auto">
            {isSummaryLoading ? (
              <div className="flex items-center justify-center h-full">
                <p>Generating summary...</p>
              </div>
            ) : (
              <div className="prose max-w-none">
                <h2>Lecture Summary</h2>
                {summary}
              </div>
            )}
          </div>
        );
      
      case 'quiz':
        return <QuizConfiguration lectureId={parseInt(lectureId!)} />;
      
      default:
        return (
          <div className="h-[calc(100vh-2rem)] bg-white rounded-lg shadow p-4 flex flex-col">
            <div className="flex-1 overflow-auto space-y-4 mb-4">
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
              />
              <Button onClick={handleSendMessage} disabled={isLoading}>
                Send
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-[calc(100vh-2rem)]">
          <PDFViewer lectureId={lectureId} />
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Lecture;
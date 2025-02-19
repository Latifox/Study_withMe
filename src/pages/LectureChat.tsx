
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PDFViewer from "@/components/PDFViewer";
import ChatMessage from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader } from "lucide-react";
import BackgroundGradient from "@/components/ui/BackgroundGradient";

const LectureChat = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    { role: 'assistant', content: "Hello! How can I help you with this lecture?" }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.choices?.[0]?.message?.content) {
        const assistantMessage = data.choices[0].message.content;
        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      } else {
        throw new Error('Invalid response format from AI');
      }
      
      setInputMessage("");
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lecture) {
    return <div>Loading...</div>;
  }

  return (
    <BackgroundGradient>
      <div className="container mx-auto p-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/course/${courseId}`)}
          className="gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-white/20 text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lectures
        </Button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-[calc(100vh-2rem)]">
            <PDFViewer lectureId={lectureId} />
          </div>
          <div className="h-[calc(100vh-2rem)] bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 shadow-lg p-4 flex flex-col">
            <div className="flex-1 overflow-auto space-y-4 mb-4">
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                disabled={isLoading}
                className="bg-white/50 backdrop-blur-sm border-white/30"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading}
                className="min-w-[80px]"
              >
                {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default LectureChat;

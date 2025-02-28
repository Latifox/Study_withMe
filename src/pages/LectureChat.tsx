
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PDFViewer from "@/components/PDFViewer";
import ChatMessage from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader, Send } from "lucide-react";
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
      <div className="container mx-auto h-screen flex flex-col p-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate(`/course/${courseId}`)}
              className="gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-black text-black"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Lectures
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
          <div className="h-full">
            <PDFViewer lectureId={lectureId} />
          </div>
          <div className="h-full bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 shadow-lg p-4 flex flex-col">
            <div className="flex-1 overflow-auto mb-4 px-2 min-h-0">
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <ChatMessage key={index} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="flex gap-2 items-center bg-white/50 backdrop-blur-sm rounded-full border border-white/30 pl-4 pr-2 py-1">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                disabled={isLoading}
                className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-500"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading}
                size="icon"
                className="rounded-full h-9 w-9 bg-blue-500 hover:bg-blue-600 flex items-center justify-center"
              >
                {isLoading ? 
                  <Loader className="w-4 h-4 animate-spin" /> : 
                  <Send className="w-4 h-4" />
                }
              </Button>
            </div>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default LectureChat;

import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PDFViewer from "@/components/PDFViewer";
import ChatMessage from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";

const LectureChat = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    { role: 'assistant', content: 'Hello! How can I help you with this lecture?' }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

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
      setCurrentStreamingMessage("");
      
      // Use the Supabase client to invoke the function
      const { data, error } = await supabase.functions.invoke('chat-with-lecture', {
        body: { lectureId, message: inputMessage }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'text/event-stream' }
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('Failed to initialize stream reader');

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.trim() === 'data: [DONE]') continue;
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices[0]?.delta?.content || '';
                setCurrentStreamingMessage(prev => prev + content);
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // After streaming is complete, add the full message to the messages array
      setMessages(prev => [...prev, { role: 'assistant', content: currentStreamingMessage }]);
      setCurrentStreamingMessage("");
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
    <div className="container mx-auto p-4">
      <Button 
        variant="outline" 
        onClick={() => navigate(`/course/${courseId}`)}
        className="mb-4 gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Lectures
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-[calc(100vh-2rem)]">
          <PDFViewer lectureId={lectureId} />
        </div>
        <div className="h-[calc(100vh-2rem)] bg-white rounded-lg shadow p-4 flex flex-col">
          <div className="flex-1 overflow-auto space-y-4 mb-4">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {currentStreamingMessage && (
              <ChatMessage 
                message={{ role: 'assistant', content: currentStreamingMessage }} 
                isStreaming={true}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={isLoading}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LectureChat;
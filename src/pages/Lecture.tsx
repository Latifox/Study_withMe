import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, FileText } from "lucide-react";
import PDFViewer from "@/components/PDFViewer";
import ChatMessage from "@/components/ChatMessage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Lecture = () => {
  const { lectureId } = useParams();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-lecture', {
        body: { lectureId, message: input }
      });

      if (error) throw error;

      const assistantMessage = { 
        role: 'assistant' as const, 
        content: data.response 
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling chat function:', error);
      const errorMessage = { 
        role: 'assistant' as const, 
        content: "I apologize, but I encountered an error processing your request. Please try again." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetSummary = async () => {
    setIsSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lecture-summary', {
        body: { lectureId }
      });

      if (error) throw error;

      const summaryMessage = { 
        role: 'assistant' as const, 
        content: "Here's a summary of the lecture:\n\n" + data.summary 
      };
      setMessages(prev => [...prev, summaryMessage]);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: "Failed to generate lecture summary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="h-screen flex">
      {/* PDF Viewer Section */}
      <div className="w-1/2 h-full bg-gray-50 border-r">
        <PDFViewer lectureId={lectureId} />
      </div>

      {/* Chat Section */}
      <div className="w-1/2 h-full flex flex-col bg-white">
        <div className="p-4 border-b">
          <Button
            onClick={handleGetSummary}
            disabled={isSummarizing}
            className="w-full gap-2"
          >
            <FileText className="w-4 h-4" />
            {isSummarizing ? "Generating Summary..." : "Get Lecture Summary"}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          {isLoading && (
            <div className="text-gray-500 italic">
              Thinking...
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the lecture..."
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSend} 
              className="gap-2"
              disabled={isLoading}
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lecture;
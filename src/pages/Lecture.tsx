import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import PDFViewer from "@/components/PDFViewer";
import ChatMessage from "@/components/ChatMessage";

const Lecture = () => {
  const { lectureId } = useParams();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput("");

    // Here we'll integrate with OpenAI API
    const response = { role: 'assistant' as const, content: "This is a placeholder response. OpenAI integration pending." };
    setMessages(prev => [...prev, response]);
  };

  return (
    <div className="h-screen flex">
      {/* PDF Viewer Section */}
      <div className="w-1/2 h-full bg-gray-50 border-r">
        <PDFViewer lectureId={lectureId} />
      </div>

      {/* Chat Section */}
      <div className="w-1/2 h-full flex flex-col bg-white">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the lecture..."
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} className="gap-2">
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
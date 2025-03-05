
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PDFViewer from "@/components/PDFViewer";
import ChatMessage from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader, Send, BookOpen, Flame, Star } from "lucide-react";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const LectureChat = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>([{
    role: 'assistant',
    content: "Hello! How can I help you with this lecture?"
  }]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalLectures, setTotalLectures] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const { data: userProgress } = useQuery({
    queryKey: ['chat-progress', lectureId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('user_progress')
        .select('score, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });
      
      return data || [];
    }
  });

  const { data: quizProgressData } = useQuery({
    queryKey: ['chat-quiz-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('quiz_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: true });
      
      return data || [];
    }
  });

  useEffect(() => {
    if (userProgress) {
      const calculateStreak = () => {
        if (!userProgress?.length) return 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const uniqueDates = new Set(
          userProgress
            .filter(p => p.completed_at)
            .map(p => {
              const date = new Date(p.completed_at!);
              date.setHours(0, 0, 0, 0);
              return date.toISOString();
            })
        );

        let streak = 0;
        let currentDate = today;

        while (uniqueDates.has(currentDate.toISOString())) {
          streak++;
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() - 1);
          currentDate.setHours(0, 0, 0, 0);
        }

        return streak;
      };

      const calculatedTotalXP = userProgress.reduce((sum, progress) => sum + (progress.score || 0), 0);
      
      setCurrentStreak(calculateStreak());
      setTotalXP(calculatedTotalXP);
    }
  }, [userProgress]);

  useEffect(() => {
    if (quizProgressData) {
      const calculatedTotalLectures = new Set(quizProgressData.map(p => p.lecture_id)).size;
      setTotalLectures(calculatedTotalLectures);
    }
  }, [quizProgressData]);

  const { data: lecture } = useQuery({
    queryKey: ["lecture", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lectures").select("*").eq("id", parseInt(lectureId!)).single();
      if (error) throw error;
      return data;
    }
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    try {
      setIsLoading(true);
      setMessages(prev => [...prev, {
        role: 'user',
        content: inputMessage
      }]);
      const {
        data,
        error
      } = await supabase.functions.invoke('chat-with-lecture', {
        body: {
          lectureId,
          message: inputMessage
        }
      });
      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      if (data?.choices?.[0]?.message?.content) {
        const assistantMessage = data.choices[0].message.content;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: assistantMessage
        }]);
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
      <div className="flex flex-col h-screen max-h-screen">
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate(`/course/${courseId}`)} 
                className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-none"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Lectures
              </Button>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent">
                  <BookOpen className="w-5 h-5 inline mr-1" />
                  Chat with your Lecture
                </span>
              </h1>
            </div>
            
            <div className="flex items-center gap-5">
              <div className={cn(
                "flex items-center gap-3 px-5 py-3 rounded-full",
                "bg-white/60 backdrop-blur-sm border border-white/50"
              )}>
                <Flame className="h-7 w-7 text-red-500 fill-red-500" />
                <span className="font-bold text-xl">{currentStreak}</span>
              </div>
              <div className={cn(
                "flex items-center gap-3 px-5 py-3 rounded-full",
                "bg-white/60 backdrop-blur-sm border border-white/50"
              )}>
                <BookOpen className="h-7 w-7 text-emerald-200" />
                <span className="font-bold text-xl">{totalLectures}</span>
              </div>
              <div className={cn(
                "flex items-center gap-3 px-5 py-3 rounded-full",
                "bg-white/60 backdrop-blur-sm border border-white/50"
              )}>
                <Star className="h-7 w-7 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-xl">{totalXP}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto flex-1 pb-4 px-4 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            <div className="h-full max-h-full overflow-hidden">
              <PDFViewer lectureId={lectureId} />
            </div>
            <div className="h-full max-h-full bg-white/20 backdrop-blur-sm rounded-lg border border-black shadow-lg p-4 flex flex-col">
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-3 pr-4">
                  {messages.map((message, index) => <ChatMessage key={index} message={message} />)}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="mt-auto flex gap-2 items-center bg-white/50 backdrop-blur-sm rounded-full border border-white/30 pl-4 pr-2 py-1">
                <Input value={inputMessage} onChange={e => setInputMessage(e.target.value)} placeholder="Type your message..." onKeyPress={e => e.key === 'Enter' && !isLoading && handleSendMessage()} disabled={isLoading} className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-500" />
                <Button onClick={handleSendMessage} disabled={isLoading} size="icon" className="rounded-full h-9 w-9 bg-blue-500 hover:bg-blue-600 flex items-center justify-center">
                  {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default LectureChat;

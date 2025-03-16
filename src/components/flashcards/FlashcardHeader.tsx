
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, BookOpen, Flame, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FlashcardHeaderProps {
  courseId: string;
  currentStreak: number;
  totalLectures: number;
  totalXP: number;
}

const FlashcardHeader = ({ courseId, currentStreak, totalLectures, totalXP }: FlashcardHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/course/${courseId}`)} 
          className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-md flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </Button>
        
        <div className="flex items-center gap-2 text-2xl font-bold">
          <span className="text-purple-500">Flashcards</span>
        </div>
      </div>
      
      <div className="flex items-center gap-5">
        <div className={cn("flex items-center gap-3 px-5 py-3 rounded-full", "bg-white/60 backdrop-blur-sm border border-white/50")}>
          <Flame className="h-7 w-7 text-red-500 fill-red-500" />
          <span className="font-bold text-xl">{currentStreak}</span>
        </div>
        <div className={cn("flex items-center gap-3 px-5 py-3 rounded-full", "bg-white/60 backdrop-blur-sm border border-white/50")}>
          <BookOpen className="h-7 w-7 text-emerald-200" />
          <span className="font-bold text-xl">{totalLectures}</span>
        </div>
        <div className={cn("flex items-center gap-3 px-5 py-3 rounded-full", "bg-white/60 backdrop-blur-sm border border-white/50")}>
          <Star className="h-7 w-7 text-yellow-500 fill-yellow-500" />
          <span className="font-bold text-xl">{totalXP}</span>
        </div>
      </div>
    </div>
  );
};

export default FlashcardHeader;

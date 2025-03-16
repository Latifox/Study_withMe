
import { useState } from "react";
import { Card } from "@/components/ui/card";

interface Flashcard {
  id?: number;
  question: string;
  answer: string;
  lecture_id?: number;
}

interface FlashcardItemProps {
  flashcard: Flashcard;
  isFlipped: boolean;
  onClick: () => void;
}

const FlashcardItem = ({ flashcard, isFlipped, onClick }: FlashcardItemProps) => {
  return (
    <div className="perspective-1000 cursor-pointer" onClick={onClick}>
      <div className={`relative w-full h-64 transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        <Card className="absolute w-full h-full p-6 flex items-center justify-center text-center backface-hidden bg-gradient-to-br from-purple-600 to-indigo-700 border border-purple-300/30 shadow-md">
          <p className="text-lg font-medium text-white">{flashcard.question}</p>
        </Card>
        <Card className="absolute w-full h-full p-6 flex items-center justify-center text-center bg-gradient-to-br from-yellow-400 to-red-600 rotate-y-180 backface-hidden border border-orange-300/30 shadow-md">
          <p className="text-lg text-white">{flashcard.answer}</p>
        </Card>
      </div>
    </div>
  );
};

export default FlashcardItem;

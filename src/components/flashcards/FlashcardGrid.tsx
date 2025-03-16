
import { useState } from "react";
import { Button } from "@/components/ui/button";
import FlashcardItem from "./FlashcardItem";

interface Flashcard {
  id?: number;
  question: string;
  answer: string;
  lecture_id?: number;
}

interface FlashcardGridProps {
  flashcards: Flashcard[];
  onGenerateMore: () => void;
}

const FlashcardGrid = ({ flashcards, onGenerateMore }: FlashcardGridProps) => {
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);

  const handleCardClick = (index: number) => {
    // If card is already active and flipped, deactivate it
    if (activeCardIndex === index && flippedCards.has(index)) {
      setFlippedCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
      setActiveCardIndex(null);
      return;
    }
    
    // If another card is active, deactivate it first
    if (activeCardIndex !== null && activeCardIndex !== index) {
      setFlippedCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(activeCardIndex);
        return newSet;
      });
    }
    
    // Activate the clicked card
    setActiveCardIndex(index);
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {flashcards.map((flashcard, index) => (
          <FlashcardItem 
            key={flashcard.id} 
            flashcard={flashcard} 
            isFlipped={flippedCards.has(index)}
            onClick={() => handleCardClick(index)}
            index={index}
            activeIndex={activeCardIndex}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={onGenerateMore}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium px-6 py-2 rounded-md shadow-md"
        >
          Generate More Flashcards
        </Button>
      </div>
    </>
  );
};

export default FlashcardGrid;

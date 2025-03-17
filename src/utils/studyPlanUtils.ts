
import { BookOpen, MessageSquare, Activity, Brain, Network, FileText, MapPin, Headphones } from "lucide-react";

export const getActionIcon = (action: string) => {
  switch (action) {
    case 'summary':
      return FileText;
    case 'story':
      return BookOpen;
    case 'chat':
      return MessageSquare;
    case 'flashcards':
      return Activity;
    case 'quiz':
      return Brain;
    case 'mindmap':
      return MapPin;
    case 'podcast':
      return Headphones;
    case 'resources':
      return Network;
    default:
      return null;
  }
};

export const isValidLearningStep = (step: any) => {
  return typeof step === 'object' &&
         typeof step.step === 'number' &&
         typeof step.title === 'string' &&
         typeof step.description === 'string' &&
         typeof step.action === 'string' &&
         typeof step.timeEstimate === 'string' &&
         Array.isArray(step.benefits) &&
         step.benefits.every(b => typeof b === 'string');
};

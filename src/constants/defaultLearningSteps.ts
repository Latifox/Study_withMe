
import { LearningStep } from "@/types/study-plan";

export const defaultSteps: LearningStep[] = [
  {
    step: 1,
    title: "Get the Big Picture",
    description: "Start with a comprehensive overview of the lecture material",
    action: "summary",
    timeEstimate: "5-10 minutes",
    benefits: ["Quick understanding", "Main points highlighted", "Visual learning"]
  },
  {
    step: 2,
    title: "Interactive Story Mode",
    description: "Experience the content through an engaging, interactive story",
    action: "story",
    timeEstimate: "15-20 minutes",
    benefits: ["Immersive learning", "Better retention", "Fun and engaging"]
  },
  {
    step: 3,
    title: "Interactive Learning Session",
    description: "Engage in a dynamic conversation about the lecture content",
    action: "chat",
    timeEstimate: "10-15 minutes",
    benefits: ["Personalized explanations", "Clear doubts", "Deep understanding"]
  },
  {
    step: 4,
    title: "Quick Review",
    description: "Test your knowledge with flashcards",
    action: "flashcards",
    timeEstimate: "5-10 minutes",
    benefits: ["Active recall", "Spaced repetition", "Memory reinforcement"]
  },
  {
    step: 5,
    title: "Knowledge Check",
    description: "Assess your understanding with a comprehensive quiz",
    action: "quiz",
    timeEstimate: "10-15 minutes",
    benefits: ["Self-assessment", "Identify gaps", "Confidence building"]
  },
  {
    step: 6,
    title: "Explore Further",
    description: "Access additional resources and related materials",
    action: "resources",
    timeEstimate: "5-10 minutes",
    benefits: ["Deeper insights", "Extended learning", "Different perspectives"]
  }
];


import { useEffect, useState } from "react";

type BubbleProps = {
  position: "left" | "right";
  sectionHeight?: string;
  tint?: string;
  colorScheme?: "purple-indigo" | "indigo-purple" | "blue-indigo" | "default";
};

const Bubbles = ({ position, sectionHeight = "100%", tint = "purple", colorScheme = "default" }: BubbleProps) => {
  const [bubbles, setBubbles] = useState<Array<{ id: number; size: number; delay: number; duration: number; opacity: number; top: number }>>([]);

  useEffect(() => {
    // Generate random bubbles
    const generateBubbles = () => {
      const newBubbles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        size: Math.floor(Math.random() * 60) + 20, // Size between 20px and 80px
        delay: Math.random() * 5, // Random delay up to 5s
        duration: Math.random() * 15 + 10, // Random duration between 10-25s
        opacity: Math.random() * 0.5 + 0.4, // Higher opacity between 0.4 and 0.9
        top: Math.random() * 40, // Random starting position from top 0-40%
      }));
      setBubbles(newBubbles);
    };

    generateBubbles();
  }, []);

  // Determine bubble style based on colorScheme with bolder colors
  const getBubbleStyle = (bubble: { opacity: number }) => {
    switch (colorScheme) {
      case "purple-indigo":
        return {
          background: "linear-gradient(to bottom right, rgba(147, 51, 234, 0.4), rgba(79, 70, 229, 0.4))",
          border: "1px solid rgba(124, 58, 237, 0.5)",
          boxShadow: "0 4px 12px rgba(124, 58, 237, 0.15)",
          opacity: bubble.opacity
        };
      case "indigo-purple":
        return {
          background: "linear-gradient(to bottom right, rgba(79, 70, 229, 0.4), rgba(147, 51, 234, 0.4))",
          border: "1px solid rgba(99, 102, 241, 0.5)",
          boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)",
          opacity: bubble.opacity
        };
      case "blue-indigo":
        return {
          background: "linear-gradient(to bottom right, rgba(59, 130, 246, 0.4), rgba(79, 70, 229, 0.4))",
          border: "1px solid rgba(79, 70, 229, 0.5)",
          boxShadow: "0 4px 12px rgba(79, 70, 229, 0.15)",
          opacity: bubble.opacity
        };
      default:
        return {
          backgroundColor: tint === "purple" ? "rgba(147, 51, 234, 0.4)" : "rgba(79, 70, 229, 0.4)",
          border: tint === "purple" ? "1px solid rgba(147, 51, 234, 0.5)" : "1px solid rgba(79, 70, 229, 0.5)",
          boxShadow: tint === "purple" ? "0 4px 12px rgba(147, 51, 234, 0.15)" : "0 4px 12px rgba(79, 70, 229, 0.15)",
          opacity: bubble.opacity
        };
    }
  };

  return (
    <div
      className={`absolute ${position === "left" ? "left-0" : "right-0"} top-0 bottom-0 w-32 md:w-40 overflow-hidden pointer-events-none h-full`}
      style={{ maxHeight: sectionHeight }}
    >
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute rounded-full"
          style={{
            width: bubble.size,
            height: bubble.size,
            [position]: `${Math.random() * 60}%`,
            top: `${bubble.top}%`,
            animation: `bubble ${bubble.duration}s linear ${bubble.delay}s infinite`,
            ...getBubbleStyle(bubble)
          }}
        />
      ))}
    </div>
  );
};

export default Bubbles;

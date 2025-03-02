
import { useEffect, useState, useRef } from "react";

type BubbleProps = {
  position: "left" | "right";
  sectionHeight?: string;
  tint?: string;
  opacity?: number;
};

const Bubbles = ({ position, sectionHeight = "100%", tint = "purple", opacity = 0.15 }: BubbleProps) => {
  const [bubbles, setBubbles] = useState<Array<{ id: number; size: number; delay: number; duration: number; opacity: number; top: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate random bubbles
    const generateBubbles = () => {
      const newBubbles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        size: Math.floor(Math.random() * 60) + 20, // Size between 20px and 80px
        delay: Math.random() * 5, // Random delay up to 5s
        duration: Math.random() * 15 + 10, // Random duration between 10-25s
        opacity: Math.random() * 0.5 + 0.4, // Higher random opacity between 0.4 and 0.9
        top: Math.random() * 40, // Random starting position from top 0-40%
      }));
      setBubbles(newBubbles);
    };

    generateBubbles();
  }, []);

  // Define vibrant color based on tint
  const getBubbleColor = () => {
    switch(tint) {
      case "purple":
        return {
          background: "rgba(147, 51, 234, " + opacity + ")",
          border: "1px solid rgba(147, 51, 234, 0.6)"
        };
      case "indigo":
        return {
          background: "rgba(79, 70, 229, " + opacity + ")",
          border: "1px solid rgba(79, 70, 229, 0.6)"
        };
      case "blue":
        return {
          background: "rgba(59, 130, 246, " + opacity + ")",
          border: "1px solid rgba(59, 130, 246, 0.6)"
        };
      default:
        return {
          background: "rgba(147, 51, 234, " + opacity + ")",
          border: "1px solid rgba(147, 51, 234, 0.6)"
        };
    }
  };

  const bubbleStyle = getBubbleColor();

  return (
    <div
      ref={containerRef}
      className={`absolute ${position === "left" ? "left-0" : "right-0"} top-0 bottom-0 w-32 md:w-40 pointer-events-none h-full`}
      style={{ minHeight: sectionHeight, overflow: "visible" }}
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
            backgroundColor: bubbleStyle.background,
            border: bubbleStyle.border,
            animation: `bubble ${bubble.duration}s linear ${bubble.delay}s infinite`,
            opacity: bubble.opacity,
            // Apply the custom property as a CSS variable
            ["--bubble-opacity" as any]: bubble.opacity,
            zIndex: 0,
          }}
        />
      ))}
    </div>
  );
};

export default Bubbles;

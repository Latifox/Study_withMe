
import { useEffect, useState, useRef } from "react";

type BubbleProps = {
  position: "left" | "right";
  sectionHeight?: string;
  tint?: string;
};

const Bubbles = ({ position, sectionHeight = "100%", tint = "purple" }: BubbleProps) => {
  const [bubbles, setBubbles] = useState<Array<{ id: number; size: number; delay: number; duration: number; opacity: number; top: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate random bubbles
    const generateBubbles = () => {
      const newBubbles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        size: Math.floor(Math.random() * 60) + 20, // Size between 20px and 80px
        delay: Math.random() * 5, // Random delay up to 5s
        duration: Math.random() * 15 + 10, // Random duration between 10-25s
        opacity: Math.random() * 0.5 + 0.1, // Random opacity between 0.1 and 0.6
        top: Math.random() * 40, // Random starting position from top 0-40%
      }));
      setBubbles(newBubbles);
    };

    generateBubbles();
  }, []);

  return (
    <div
      ref={containerRef}
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
            backgroundColor: tint === "purple" ? "rgba(147, 51, 234, 0.15)" : "rgba(79, 70, 229, 0.15)",
            border: tint === "purple" ? "1px solid rgba(147, 51, 234, 0.3)" : "1px solid rgba(79, 70, 229, 0.3)",
            animation: `bubble ${bubble.duration}s linear ${bubble.delay}s infinite`,
            opacity: bubble.opacity,
            // Apply the custom property as a CSS variable using proper TypeScript syntax
            ["--bubble-opacity" as any]: bubble.opacity,
          }}
        />
      ))}
    </div>
  );
};

export default Bubbles;

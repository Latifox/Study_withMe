
import React, { useEffect, useState } from 'react';

interface BackgroundGradientProps {
  children: React.ReactNode;
}

const BackgroundGradient = ({ children }: BackgroundGradientProps) => {
  const [bubbles, setBubbles] = useState<Array<{
    id: number;
    size: number;
    position: { left?: string; right?: string; top?: string; bottom?: string };
    opacity: number;
    color: string;
    animationDuration: string;
  }>>([]);

  useEffect(() => {
    // Generate bubbles on component mount
    const generateBubbles = () => {
      const newBubbles = [];
      const totalBubbles = 40; // Total number of bubbles (20 per side)
      
      const bubbleColors = [
        "bg-purple-300/70",
        "bg-indigo-300/70",
        "bg-pink-300/70",
        "bg-blue-300/70",
        "bg-violet-400/60",
        "bg-fuchsia-300/70",
        "bg-sky-300/70",
      ];
      
      // Generate bubbles for left side
      for (let i = 0; i < totalBubbles / 2; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const leftPos = Math.random() * 15; // Random position between 0-15%
        const bottom = -100 - Math.random() * 100; // Start below viewport
        const opacity = 0.1 + Math.random() * 0.4; // Random opacity between 0.1-0.5
        const colorIndex = Math.floor(Math.random() * bubbleColors.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration between 15-35s
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            left: `${leftPos}%`, 
            bottom: `${bottom}%` 
          },
          opacity,
          color: bubbleColors[colorIndex],
          animationDuration
        });
      }
      
      // Generate bubbles for right side
      for (let i = totalBubbles / 2; i < totalBubbles; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const rightPos = Math.random() * 15; // Random position between 0-15%
        const bottom = -100 - Math.random() * 100; // Start below viewport
        const opacity = 0.1 + Math.random() * 0.4; // Random opacity between 0.1-0.5
        const colorIndex = Math.floor(Math.random() * bubbleColors.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration between 15-35s
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            right: `${rightPos}%`, 
            bottom: `${bottom}%` 
          },
          opacity,
          color: bubbleColors[colorIndex],
          animationDuration
        });
      }
      
      setBubbles(newBubbles);
    };

    generateBubbles();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Bubbles */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className={`absolute rounded-full ${bubble.color} bubble-flow`}
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: bubble.position.left,
            right: bubble.position.right,
            bottom: bubble.position.bottom,
            opacity: bubble.opacity,
            animation: `bubble-flow ${bubble.animationDuration} linear infinite`,
          }}
        />
      ))}

      {/* Content container */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Add keyframes for bubble flow animation */}
      <style jsx global>{`
        @keyframes bubble-flow {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-120vh);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default BackgroundGradient;

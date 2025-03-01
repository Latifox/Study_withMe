
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
    gradient: string;
    animationDuration: string;
  }>>([]);

  useEffect(() => {
    // Generate bubbles on component mount
    const generateBubbles = () => {
      const newBubbles = [];
      const totalBubbles = 40; // Total number of bubbles (20 per side)
      
      // Define more sophisticated gradients for bubbles
      const bubbleGradients = [
        "bg-gradient-to-br from-purple-300 to-indigo-500",
        "bg-gradient-to-r from-pink-300 via-purple-400 to-indigo-400",
        "bg-gradient-to-tr from-blue-300 via-sky-400 to-purple-400",
        "bg-gradient-to-r from-indigo-300 via-purple-400 to-fuchsia-400",
        "bg-gradient-to-br from-violet-300 via-purple-400 to-fuchsia-500",
        "bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-500",
        "bg-gradient-to-tr from-fuchsia-300 via-pink-400 to-purple-500",
        "bg-gradient-to-br from-pink-200 via-pink-400 to-pink-500",
        "bg-gradient-to-r from-purple-200 via-purple-400 to-purple-600",
      ];
      
      // Generate bubbles for left side - positioned in designated columns
      for (let i = 0; i < totalBubbles / 2; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const leftPos = Math.random() * 15; // Random position between 0-15%
        const bottom = -100 - Math.random() * 100; // Start below viewport
        const opacity = 0.3 + Math.random() * 0.4; // Random opacity between 0.3-0.7
        const gradientIndex = Math.floor(Math.random() * bubbleGradients.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration between 15-35s
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            left: `${leftPos}%`, 
            bottom: `${bottom}%` 
          },
          opacity,
          gradient: bubbleGradients[gradientIndex],
          animationDuration
        });
      }
      
      // Generate bubbles for right side - positioned in designated columns
      for (let i = totalBubbles / 2; i < totalBubbles; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const rightPos = Math.random() * 15; // Random position between 0-15%
        const bottom = -100 - Math.random() * 100; // Start below viewport
        const opacity = 0.3 + Math.random() * 0.4; // Random opacity between 0.3-0.7
        const gradientIndex = Math.floor(Math.random() * bubbleGradients.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration between 15-35s
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            right: `${rightPos}%`, 
            bottom: `${bottom}%` 
          },
          opacity,
          gradient: bubbleGradients[gradientIndex],
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
          className={`absolute rounded-full ${bubble.gradient} bubble-flow shadow-md`}
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
      <style>
        {`
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
        `}
      </style>
    </div>
  );
};

export default BackgroundGradient;


import React, { useEffect, useState } from 'react';

interface BackgroundGradientProps {
  children: React.ReactNode;
}

const BackgroundGradient = ({ children }: BackgroundGradientProps) => {
  const [bubbles, setBubbles] = useState<Array<{
    id: number;
    size: number;
    position: { left?: string; right?: string; top: string };
    opacity: number;
    gradient: string;
    animationDuration: string;
  }>>([]);

  useEffect(() => {
    // Generate bubbles on component mount
    const generateBubbles = () => {
      const newBubbles = [];
      const totalBubbles = 40; // Total number of bubbles (20 per side)
      
      // Define more subtle purple-to-indigo gradients for bubbles
      // These are inspired by the "AI-Powered Education" text gradient but toned down
      const bubbleGradients = [
        "bg-gradient-to-br from-purple-100 to-indigo-200",
        "bg-gradient-to-r from-purple-100 to-indigo-100",
        "bg-gradient-to-tr from-indigo-100 to-purple-200",
        "bg-gradient-to-br from-violet-100 to-indigo-200",
        "bg-gradient-to-r from-fuchsia-100 to-purple-200",
        "bg-gradient-to-tr from-purple-100 to-indigo-300/70",
        "bg-gradient-to-br from-violet-50 to-indigo-200",
        "bg-gradient-to-r from-fuchsia-100 to-indigo-100",
        "bg-gradient-to-tr from-indigo-100 to-fuchsia-200",
      ];
      
      // Generate bubbles for left side
      for (let i = 0; i < totalBubbles / 2; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const leftPos = Math.random() * 15; // Random position between 0-15% from left
        const topPos = Math.random() * 15 - 20; // Start above viewport or just entering
        const opacity = 0.2 + Math.random() * 0.3; // Random opacity between 0.2-0.5
        const gradientIndex = Math.floor(Math.random() * bubbleGradients.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration between 15-35s
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            left: `${leftPos}%`, 
            top: `${topPos}%` 
          },
          opacity,
          gradient: bubbleGradients[gradientIndex],
          animationDuration
        });
      }
      
      // Generate bubbles for right side
      for (let i = totalBubbles / 2; i < totalBubbles; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const rightPos = Math.random() * 15; // Random position between 0-15% from right
        const topPos = Math.random() * 15 - 20; // Start above viewport or just entering
        const opacity = 0.2 + Math.random() * 0.3; // Random opacity between 0.2-0.5
        const gradientIndex = Math.floor(Math.random() * bubbleGradients.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration between 15-35s
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            right: `${rightPos}%`, 
            top: `${topPos}%` 
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-50/20 to-indigo-50/20"></div>
      
      {/* Bubbles */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className={`absolute rounded-full ${bubble.gradient} bubble-flow shadow-sm`}
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: bubble.position.left,
            right: bubble.position.right,
            top: bubble.position.top,
            opacity: bubble.opacity,
            animation: `bubble-down ${bubble.animationDuration} linear infinite`,
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
        @keyframes bubble-down {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          85% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(120vh);
            opacity: 0;
          }
        }
        `}
      </style>
    </div>
  );
};

export default BackgroundGradient;

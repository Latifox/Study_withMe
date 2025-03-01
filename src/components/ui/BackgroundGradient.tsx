
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
      const totalBubbles = 60; // Increased from 40 to have more bubbles covering the page
      
      // Define more bold gradients with increased saturation for top section (purple/indigo)
      const topGradients = [
        "bg-gradient-to-br from-purple-300 to-indigo-400",
        "bg-gradient-to-r from-purple-400 to-indigo-300",
        "bg-gradient-to-tr from-indigo-300 to-purple-500",
        "bg-gradient-to-br from-violet-400 to-indigo-500",
        "bg-gradient-to-r from-fuchsia-300 to-purple-400",
        "bg-gradient-to-tr from-purple-300 to-indigo-500",
        "bg-gradient-to-br from-violet-300 to-indigo-400",
        "bg-gradient-to-r from-fuchsia-400 to-indigo-300",
        "bg-gradient-to-tr from-indigo-300 to-fuchsia-400",
        "bg-gradient-to-bl from-purple-400 via-violet-400 to-indigo-300",
        "bg-gradient-to-r from-pink-300 via-purple-400 to-indigo-400",
        "bg-gradient-to-tr from-indigo-400 via-violet-300 to-purple-400",
      ];
      
      // Define gradients for Star icon (yellow/amber) on left side
      const starGradients = [
        "bg-gradient-to-br from-yellow-300 to-amber-400",
        "bg-gradient-to-r from-yellow-400 to-amber-300",
        "bg-gradient-to-tr from-amber-300 to-yellow-500",
        "bg-gradient-to-br from-yellow-400 to-amber-500",
        "bg-gradient-to-r from-amber-300 to-yellow-400",
        "bg-gradient-to-bl from-yellow-400 via-amber-400 to-yellow-300",
        "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400",
      ];
      
      // Define gradients for Flame icon (red/orange) on right side
      const flameGradients = [
        "bg-gradient-to-br from-red-300 to-orange-400",
        "bg-gradient-to-r from-red-400 to-orange-300",
        "bg-gradient-to-tr from-orange-400 to-red-500",
        "bg-gradient-to-br from-red-400 to-orange-500",
        "bg-gradient-to-r from-orange-300 to-red-400",
        "bg-gradient-to-bl from-red-400 via-orange-400 to-red-300",
        "bg-gradient-to-r from-orange-400 via-red-400 to-orange-500",
      ];
      
      // Generate bubbles for left side (top section - purple/indigo)
      for (let i = 0; i < totalBubbles / 6; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const leftPos = Math.random() * 15; // Random position between 0-15% from left
        const topPos = Math.random() * 5 - 20; // Start above viewport or just entering
        const opacity = 0.3 + Math.random() * 0.3; // Random opacity between 0.3-0.6
        const gradientIndex = Math.floor(Math.random() * topGradients.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration between 15-35s
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            left: `${leftPos}%`, 
            top: `${topPos}%` 
          },
          opacity,
          gradient: topGradients[gradientIndex],
          animationDuration
        });
      }
      
      // Generate bubbles for right side (top section - purple/indigo)
      for (let i = totalBubbles / 6; i < totalBubbles / 3; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const rightPos = Math.random() * 15; // Random position between 0-15% from right
        const topPos = Math.random() * 5 - 20; // Start above viewport or just entering
        const opacity = 0.3 + Math.random() * 0.3; // Random opacity between 0.3-0.6
        const gradientIndex = Math.floor(Math.random() * topGradients.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration between 15-35s
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            right: `${rightPos}%`, 
            top: `${topPos}%` 
          },
          opacity,
          gradient: topGradients[gradientIndex],
          animationDuration
        });
      }
      
      // Generate bubbles for left side (middle section - transition from purple to star yellow)
      for (let i = totalBubbles / 3; i < totalBubbles / 2; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const leftPos = Math.random() * 15; // Random position between 0-15% from left
        const topPos = Math.random() * 15 + 20; // Start from middle section
        const opacity = 0.3 + Math.random() * 0.3; // Random opacity between 0.3-0.6
        
        // Mix gradients to create transition
        const useTopGradient = Math.random() < 0.4; // 40% chance to use top gradient
        const gradientSet = useTopGradient ? topGradients : starGradients;
        const gradientIndex = Math.floor(Math.random() * gradientSet.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            left: `${leftPos}%`, 
            top: `${topPos}%` 
          },
          opacity,
          gradient: gradientSet[gradientIndex],
          animationDuration
        });
      }
      
      // Generate bubbles for right side (middle section - transition from purple to flame red)
      for (let i = totalBubbles / 2; i < 2 * totalBubbles / 3; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const rightPos = Math.random() * 15; // Random position between 0-15% from right
        const topPos = Math.random() * 15 + 20; // Start from middle section
        const opacity = 0.3 + Math.random() * 0.3; // Random opacity between 0.3-0.6
        
        // Mix gradients to create transition
        const useTopGradient = Math.random() < 0.4; // 40% chance to use top gradient
        const gradientSet = useTopGradient ? topGradients : flameGradients;
        const gradientIndex = Math.floor(Math.random() * gradientSet.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            right: `${rightPos}%`, 
            top: `${topPos}%` 
          },
          opacity,
          gradient: gradientSet[gradientIndex],
          animationDuration
        });
      }
      
      // Generate bubbles for left side (bottom section - full star yellow)
      for (let i = 2 * totalBubbles / 3; i < 5 * totalBubbles / 6; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const leftPos = Math.random() * 15; // Random position between 0-15% from left
        const topPos = Math.random() * 20 + 40; // Start from bottom section
        const opacity = 0.3 + Math.random() * 0.3; // Random opacity between 0.3-0.6
        const gradientIndex = Math.floor(Math.random() * starGradients.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            left: `${leftPos}%`, 
            top: `${topPos}%` 
          },
          opacity,
          gradient: starGradients[gradientIndex],
          animationDuration
        });
      }
      
      // Generate bubbles for right side (bottom section - full flame red)
      for (let i = 5 * totalBubbles / 6; i < totalBubbles; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const rightPos = Math.random() * 15; // Random position between 0-15% from right
        const topPos = Math.random() * 20 + 40; // Start from bottom section
        const opacity = 0.3 + Math.random() * 0.3; // Random opacity between 0.3-0.6
        const gradientIndex = Math.floor(Math.random() * flameGradients.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            right: `${rightPos}%`, 
            top: `${topPos}%` 
          },
          opacity,
          gradient: flameGradients[gradientIndex],
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
      <div className="absolute inset-0 bg-gradient-to-b from-purple-100/30 to-indigo-100/30"></div>
      
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
            opacity: 0.6;
          }
          85% {
            opacity: 0.6;
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

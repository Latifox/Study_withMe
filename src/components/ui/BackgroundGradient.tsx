
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
    animationDelay: string;
    animationDuration: string;
  }>>([]);

  useEffect(() => {
    // Generate bubbles on component mount
    const generateBubbles = () => {
      const newBubbles = [];
      const totalBubbles = 40; // Total number of bubbles (20 per side)
      
      // Generate bubbles for left side
      for (let i = 0; i < totalBubbles / 2; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const leftPos = Math.random() * 30; // Random position between 0-30%
        const topPos = Math.random() * 100; // Random initial vertical position
        const opacity = 0.1 + Math.random() * 0.4; // Random opacity between 0.1-0.5
        const animationDelay = `${Math.random() * 15}s`; // Random delay up to 15s
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration between 15-35s
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            left: `${leftPos}%`, 
            top: `${topPos}%` 
          },
          opacity,
          animationDelay,
          animationDuration
        });
      }
      
      // Generate bubbles for right side
      for (let i = totalBubbles / 2; i < totalBubbles; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const rightPos = Math.random() * 30; // Random position between 0-30%
        const topPos = Math.random() * 100; // Random initial vertical position
        const opacity = 0.1 + Math.random() * 0.4; // Random opacity between 0.1-0.5
        const animationDelay = `${Math.random() * 15}s`; // Random delay up to 15s
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration between 15-35s
        
        newBubbles.push({
          id: i,
          size,
          position: { 
            right: `${rightPos}%`, 
            top: `${topPos}%` 
          },
          opacity,
          animationDelay,
          animationDuration
        });
      }
      
      setBubbles(newBubbles);
    };

    generateBubbles();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* White background */}
      <div 
        className="absolute inset-0 z-0 bg-white"
      >
        {/* No mesh grid overlay on white background */}
      </div>

      {/* Content container */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default BackgroundGradient;

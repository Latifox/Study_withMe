
import React, { useState, useEffect } from 'react';

interface BackgroundGradientProps {
  children: React.ReactNode;
}

const BackgroundGradient = ({ children }: BackgroundGradientProps) => {
  const [bubbles, setBubbles] = useState<Array<{
    id: number;
    size: number;
    color: string;
    position: string;
    delay: number;
  }>>([]);

  // Generate bubbles on component mount
  useEffect(() => {
    const bubbleColors = [
      'rgba(111, 207, 151, 0.7)',
      'rgba(86, 180, 211, 0.7)',
      'rgba(123, 104, 238, 0.7)',
      'rgba(240, 128, 128, 0.7)',
      'rgba(173, 216, 230, 0.7)',
      'rgba(255, 182, 193, 0.7)',
    ];
    
    const generateBubbles = () => {
      const newBubbles = [];
      // Generate 24 bubbles - 12 for left side, 12 for right side
      for (let i = 0; i < 24; i++) {
        const size = 30 + Math.random() * 60; // Random size between 30-90px
        const color = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];
        
        // Left side bubbles
        if (i < 12) {
          const leftPosition = 5 + Math.random() * 30; // Random position between 5-35%
          newBubbles.push({
            id: i,
            size,
            color,
            position: `left: ${leftPosition}%;`,
            delay: i % 6 // Create 6 different delay groups
          });
        } 
        // Right side bubbles
        else {
          const rightPosition = 5 + Math.random() * 30; // Random position between 5-35%
          newBubbles.push({
            id: i,
            size,
            color,
            position: `right: ${rightPosition}%;`,
            delay: i % 6 // Create 6 different delay groups
          });
        }
      }
      setBubbles(newBubbles);
    };

    generateBubbles();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient container */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #FFE5A3 0%, #FFFFFF 50%, #A7D1FF 100%)',
          zIndex: 0
        }}
      >
        {/* Mesh grid overlay - kept from original */}
        <div className="absolute inset-0" style={{ opacity: 0.15 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern 
                id="grid" 
                width="40" 
                height="40" 
                patternUnits="userSpaceOnUse"
              >
                <path 
                  d="M 40 0 L 0 0 0 40" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" className="text-black" />
          </svg>
        </div>

        {/* Flowing bubbles */}
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            className={`bubble-flow flow-${bubble.delay + 1}`}
            style={{
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              backgroundColor: bubble.color,
              [bubble.position.split(':')[0]]: bubble.position.split(':')[1].trim(),
              animationDelay: `-${bubble.delay * 5}s`
            }}
          ></div>
        ))}
      </div>

      {/* Content container */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default BackgroundGradient;


import React, { useState, useEffect } from 'react';

interface BackgroundGradientProps {
  children: React.ReactNode;
}

const BackgroundGradient = ({ children }: BackgroundGradientProps) => {
  const [bubbles, setBubbles] = useState<Array<{
    id: number;
    size: number;
    color: string;
    position: { left?: string; right?: string; top: string };
    delay: number;
  }>>([]);

  // Generate bubbles on component mount
  useEffect(() => {
    const bubbleColors = [
      'rgba(111, 207, 151, 0.7)',  // Light green
      'rgba(86, 180, 211, 0.7)',   // Light blue
      'rgba(123, 104, 238, 0.7)',  // Medium purple
      'rgba(240, 128, 128, 0.7)',  // Light coral
      'rgba(173, 216, 230, 0.7)',  // Light blue
      'rgba(255, 182, 193, 0.7)',  // Light pink
      'rgba(147, 112, 219, 0.7)',  // Medium purple
      'rgba(135, 206, 235, 0.7)',  // Sky blue
    ];
    
    const generateBubbles = () => {
      const newBubbles = [];
      
      // Generate bubbles for left side
      for (let i = 0; i < 14; i++) {
        const size = 25 + Math.random() * 70; // Random size between 25-95px
        const color = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];
        const leftPos = 2 + Math.random() * 25; // Random position between 2-27%
        const topPos = Math.random() * 100; // Random initial vertical position
        
        newBubbles.push({
          id: i,
          size,
          color,
          position: { 
            left: `${leftPos}%`, 
            top: `${topPos}%` 
          },
          delay: i % 7 // Create 7 different delay groups
        });
      }
      
      // Generate bubbles for right side
      for (let i = 14; i < 28; i++) {
        const size = 25 + Math.random() * 70; // Random size between 25-95px
        const color = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];
        const rightPos = 2 + Math.random() * 25; // Random position between 2-27%
        const topPos = Math.random() * 100; // Random initial vertical position
        
        newBubbles.push({
          id: i,
          size,
          color,
          position: { 
            right: `${rightPos}%`, 
            top: `${topPos}%` 
          },
          delay: i % 7 // Create 7 different delay groups
        });
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
            className={`bubble-animate flow-${bubble.delay + 1}`}
            style={{
              position: 'absolute',
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              backgroundColor: bubble.color,
              borderRadius: '50%',
              filter: 'blur(5px)',
              ...(bubble.position.left && { left: bubble.position.left }),
              ...(bubble.position.right && { right: bubble.position.right }),
              top: bubble.position.top,
              animationDelay: `-${bubble.delay * 4}s`
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
